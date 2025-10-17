import { Database } from '../database/supabase';
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from '@solana/web3.js';
import { OpenStayProgram, OpenStayConnection, getEscrowPda } from '../solana_provider/solanaProvider';

class BookingService {

  async createBooking(
    listingPDA: string,
    guestPublicKey: string,
    userId: string,
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date
  ) {
    // 1️⃣ Validate that the user exists
    const users = await Database.select<{ id: string }>('users', '*', { id: userId });
    if (!users.length) throw new Error('User not found');
    const guestId = users[0].id;

    // 2️⃣ Get property info
    const properties = await Database.select<{ id: string; price_per_night: number }>('properties', '*', { id: propertyId });
    if (!properties.length) throw new Error('Property not found');
    const property = properties[0];

    // 3️⃣ Fetch listing on-chain to verify not already booked
    const listingPda = new PublicKey(listingPDA);
    const listing = await OpenStayProgram.account.listing.fetch(listingPda);
    if (listing.isBooked === true) throw new Error('Listing is already booked on-chain');

    // 4️⃣ Compute escrow PDA and price
    const { escrowPda } = getEscrowPda(listingPda);
    const totalPrice = await this.calculatePrice(propertyId, checkInDate, checkOutDate);

    // 5️⃣ Create booking in database
    const booking = await Database.insert('bookings', {
      property_id: propertyId,
      guest_user_id: guestId,
      check_in: checkInDate,
      check_out: checkOutDate,
      total_price: totalPrice,
      status: 'pending',
      escrow_account: escrowPda.toBase58()
    });
    console.log(JSON.stringify(booking, null, 2)); 
    return booking;
  }

  // ✅ Calculate total price based on property and nights
  async calculatePrice(propertyId: string, checkIn: Date, checkOut: Date): Promise<number> {
    // const query = `
    //   SELECT price_per_night
    //   FROM properties
    //   WHERE id = $1
    //   LIMIT 1
    // `;
    //const result = await Database.query<{ price_per_night: string }>(query, [propertyId]);
    // if (!result[0]) throw new Error('Property not found');

    // const pricePerNight = parseFloat(result[0].price_per_night);
    const nights = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24);
    return nights * 10;
  }

  // ✅ Retrieve bookings for a user
  async getUserBookings(userId: string) {
    const query = `
      SELECT b.*, p.title AS property_title, p.address AS property_address
      FROM bookings b
      JOIN properties p ON b.property_id = p.id
      WHERE b.guest_user_id = $1
      ORDER BY b.check_in DESC
    `;
    const bookings = await Database.query<any>(query, [userId]);
    return bookings;
  }

  // ✅ Check-in (only if user owns the booking)
  async checkInBooking(userId: string, bookingId: string) {
    const query = `
      SELECT * FROM bookings
      WHERE id = $1 AND guest_user_id = $2
    `;
    const bookings = await Database.query<any>(query, [bookingId, userId]);
    if (!bookings.length) throw new Error('Unauthorized or booking not found');

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

  // ✅ Host releases escrow (mark completed)
  async releasePayment(bookingId: string, txSignature: string, hostPublicKey: string) {
    const bookings = await Database.select<any>('bookings', '*', { id: bookingId });
    if (!bookings.length) throw new Error('Booking not found');
    const booking = bookings[0];

    // Verify transaction exists
    const status = await OpenStayConnection.getSignatureStatus(txSignature);
    if (!status?.value?.confirmationStatus) {
      throw new Error('Transaction not confirmed on-chain');
    }

    // Update DB status
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

  // ✅ Refund escrow to guest
  async refundPayment(bookingId: string, txSignature: string) {
    const bookings = await Database.select<any>('bookings', '*', { id: bookingId });
    if (!bookings.length) throw new Error('Booking not found');
    const booking = bookings[0];

    const status = await OpenStayConnection.getSignatureStatus(txSignature);
    if (!status?.value?.confirmationStatus) {
      throw new Error('Refund transaction not confirmed');
    }

    const updated = await Database.query<any>(
      `
      UPDATE bookings
      SET status = 'refunded'
      WHERE id = $1
      RETURNING *
      `,
      [bookingId]
    );

    await Database.query<any>(
      `
      INSERT INTO transactions (booking_id, type, tx_signature, amount, status)
      VALUES ($1, 'refund', $2, $3, 'confirmed')
      `,
      [bookingId, txSignature, booking.total_price]
    );

    return updated[0];
  }

  // ✅ Delete booking (only pending/cancelled)
  async deleteBooking(userId: string, bookingId: string) {
    const query = `
      SELECT * FROM bookings
      WHERE id = $1 AND guest_user_id = $2
    `;
    const bookings = await Database.query<any>(query, [bookingId, userId]);
    if (!bookings.length) throw new Error('Unauthorized or booking not found');

    const booking = bookings[0];
    if (['paid', 'confirmed', 'checked_in'].includes(booking.status)) {
      throw new Error('Cannot cancel active booking');
    }

    await Database.query(
      `DELETE FROM bookings WHERE id = $1`,
      [bookingId]
    );

    return { id: bookingId, deleted: true };
  }

  // ✅ Confirm on-chain payment (mark in_escrow)
  async confirmBooking(
    bookingId: string,
    txSignature: string,
    listingPda: string,
    escrowPda: string,
    guestPublicKey: string
  ) {
    const bookings = await Database.select<any>('bookings', '*', { id: bookingId });
    if (!bookings.length) throw new Error('Booking not found');

    // 1️⃣ Ensure Solana tx confirmed
    const confirmation = await OpenStayConnection.getSignatureStatus(txSignature);
    if (!confirmation?.value?.confirmationStatus) {
      throw new Error('Transaction not confirmed on-chain');
    }

    // 2️⃣ Ensure on-chain listing reflects the booking
    const onchainListing = await OpenStayProgram.account.listing.fetch(new PublicKey(listingPda));
    if (!onchainListing) throw new Error('Listing not found on-chain');

    if (onchainListing.isBooked !== true) {
      throw new Error('On-chain listing not marked as booked. Ensure your Solana deposit instruction sets is_booked = true.');
    }

    // 3️⃣ Update booking
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

    // 4️⃣ Log transaction
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
