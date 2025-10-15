import { Database } from '../database/supabase';
import * as anchor from "@coral-xyz/anchor";
import {PublicKey } from '@solana/web3.js';
import { OpenStayProgram , OpenStayConnection, getEscrowPda} from '../solana_provider/solanaProvider';


class BookingService {
 
  async createBooking(listingPDA:string, guestPublicKey: string, userId: string, propertyId: string, checkInDate: Date, checkOutDate: Date) {
   // 1. Find the guest ID for this user
    const guests = await Database.select<{ id: number }>('guests', '*', { user_id: userId });
    if (!guests.length) throw new Error('Guest profile not found');
    const guestId = guests[0].id;

    // 2. Get property details
    const properties = await Database.select<{ id: number; price_per_night: number }>('properties', '*', { id: propertyId });
    if (!properties.length) throw new Error('Property not found');
    const property = properties[0];
      // get the public key of the listing 
    const listingPda = new anchor.web3.PublicKey(listingPDA);
    const guestKey = new anchor.web3.PublicKey(guestPublicKey);
    const listing = await OpenStayProgram.account.listing.fetch(listingPda);
    if (listing.isBooked) {
       throw new Error('Already booked');
    }
    const { escrowPda } = getEscrowPda(listingPda);
    const totalPrice = await this.calculatePrice(propertyId, checkInDate, checkOutDate);
    // // 5. Create the booking
    const booking = await Database.insert('bookings', {
      property_id: propertyId,
      guest_id: guestId,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      total_price: totalPrice,
      status: 'pending',
      escrow_account: escrowPda.toBase58()
    });

     return booking;
  }
  async calculatePrice(propertyId: string, checkIn: Date, checkOut: Date): Promise<number> {
  // Query the property's price per night using raw SQL
  const query = `
    SELECT price_per_night
    FROM properties
    WHERE id = $1
    LIMIT 1
  `;

  const result = await Database.query<{ price_per_night: string }>(query, [propertyId]);

  if (!result[0]) {
    throw new Error('Property not found');
  }

  const pricePerNight = parseFloat(result[0].price_per_night);

  // Calculate the number of nights
  const nights = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24);

  return nights * pricePerNight;
 }

  async helperCreateBooking(propertyId: string, guestId: number, checkIn: Date, checkOut: Date) {
  const totalPrice = await this.calculatePrice(propertyId, checkIn, checkOut);

  const query = `
    INSERT INTO bookings (property_id, guest_id, check_in_date, check_out_date, total_price, status)
    VALUES ($1, $2, $3, $4, $5, 'pending')
    RETURNING *
  `;

  const result = await Database.query<any>(query, [
    propertyId,
    guestId,
    checkIn.toISOString(),
    checkOut.toISOString(),
    totalPrice
  ]);

  return result[0]; 
}
  // ✅ Get all bookings for a user
  async getUserBookings(userId: string) {
    const bookings = await Database.query<any>(
      `
      SELECT b.*, p.title AS property_title, p.address AS property_address
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN properties p ON b.property_id = p.id
      WHERE g.user_id = $1
      ORDER BY b.check_in_date DESC
      `,
      [userId]
    );
    return bookings;
  }

  async checkInBooking(userId: string, bookingId: string) {
    // Ensure the guest owns this booking
    const bookings = await Database.query<any>(
      `
      SELECT b.*, g.user_id
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      WHERE b.id = $1 AND g.user_id = $2
      `,
      [bookingId, userId]
    );
    if (!bookings.length) throw new Error('Unauthorized or booking not found');
    const booking = bookings[0];

    // Update booking status
    const updated = await Database.query<any>(
      `
      UPDATE bookings
      SET status = 'checked_in'
      WHERE id = $1
      RETURNING *
      `,
      [bookingId]
    );

    return updated[0];
  }

  // 💸 Host releases escrow (payout)
  async releasePayment(bookingId: string, txSignature: string, hostPublicKey: string) {
    // Validate booking exists
    const bookings = await Database.select<any>('bookings', '*', { id: bookingId });
    if (!bookings.length) throw new Error('Booking not found');
    const booking = bookings[0];

    // Confirm transaction on Solana
    const status = await OpenStayConnection.getSignatureStatus(txSignature);
    if (!status?.value?.confirmationStatus) {
      throw new Error('Transaction not confirmed on-chain');
    }

    // Optional: verify on-chain release instruction succeeded
    const listing = await OpenStayProgram.account.listing.fetch(new PublicKey(booking.property_id));
    if (!listing) throw new Error('Listing not found on-chain');

    // Update DB
    const updated = await Database.query<any>(
      `
      UPDATE bookings
      SET status = 'completed',
          release_tx_signature = $1
      WHERE id = $2
      RETURNING *
      `,
      [txSignature, bookingId]
    );

    // Log transaction
    await Database.query<any>(
      `
      INSERT INTO transactions (booking_id, type, tx_signature, amount, status)
      VALUES ($1, 'release', $2, $3, 'confirmed')
      `,
      [bookingId, txSignature, booking.total_price]
    );

    return updated[0];
  }

  // 💰 Refund guest from escrow
  async refundPayment(bookingId: string, txSignature: string, guestPublicKey: string) {
    // Validate booking exists
    const bookings = await Database.select<any>('bookings', '*', { id: bookingId });
    if (!bookings.length) throw new Error('Booking not found');
    const booking = bookings[0];

    // Check Solana transaction
    const status = await OpenStayConnection.getSignatureStatus(txSignature);
    if (!status?.value?.confirmationStatus) {
      throw new Error('Refund transaction not confirmed on-chain');
    }

    // Update DB
    const updated = await Database.query<any>(
      `
      UPDATE bookings
      SET status = 'refunded'
      WHERE id = $1
      RETURNING *
      `,
      [bookingId]
    );

    // Add transaction record
    await Database.query<any>(
      `
      INSERT INTO transactions (booking_id, type, tx_signature, amount, status)
      VALUES ($1, 'refund', $2, $3, 'confirmed')
      `,
      [bookingId, txSignature, booking.total_price]
    );

    return updated[0];
  }
  // ✅ Delete/cancel a booking
  async deleteBooking(userId: string, bookingId: string) {
    // Ensure booking belongs to user and is cancellable
    const bookings = await Database.query<any>(
      `
      SELECT b.*, g.user_id
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      WHERE b.id = $1 AND g.user_id = $2
      `,
      [bookingId, userId]
    );

    if (!bookings.length) throw new Error('Booking not found or unauthorized');

    const booking = bookings[0];
    if (['paid', 'confirmed', 'checked_in'].includes(booking.status)) {
      throw new Error('Cannot cancel an active booking');
    }

    // Delete booking
    await Database.query(
      `
      DELETE FROM bookings
      WHERE id = $1
      `,
      [bookingId]
    );

    return { id: bookingId, deleted: true };
  }
  async confirmBooking(
    bookingId: string,
    txSignature: string,
    listingPda: string,
    escrowPda: string,
    guestPublicKey: string
  ) {
    // 1️⃣ Verify booking exists
    const bookings = await Database.select<any>('bookings', '*', { id: bookingId });
    if (!bookings.length) throw new Error('Booking not found');

    const booking = bookings[0];

    // 2️⃣ Check if transaction is confirmed on-chain
    const confirmation = await OpenStayConnection.getSignatureStatus(txSignature);
    if (!confirmation?.value?.confirmationStatus) {
      throw new Error('Transaction not found or not yet confirmed');
    }

    // 3️⃣ Optionally verify escrowPda is valid for the listing
    const onchainListing = await OpenStayProgram.account.listing.fetch(new PublicKey(listingPda));
    if (!onchainListing) throw new Error('Listing not found on-chain');

    if (onchainListing.isBooked !== true) {
      throw new Error('On-chain listing not marked as booked');
    }

    // 4️⃣ Update booking record in DB
    const updated = await Database.query<any>(
      `
      UPDATE bookings
      SET 
        status = 'in_escrow',
        escrow_account = $1,
        payment_tx_signature = $2
      WHERE id = $3
      RETURNING *
      `,
      [escrowPda, txSignature, bookingId]
    );

    const confirmedBooking = updated[0];

    // 5️⃣ Insert a transaction record (for audit trail)
    await Database.query<any>(
      `
      INSERT INTO transactions (booking_id, type, tx_signature, amount, status)
      VALUES ($1, 'deposit', $2, $3, 'confirmed')
      `,
      [bookingId, txSignature, confirmedBooking.total_price]
    );

    return confirmedBooking;
  }
}

export default new BookingService();
