import { Database } from '../database/supabase';

class BookingService {
  // ✅ Create a booking if available
  async createBooking(userId: string, propertyId: number, checkInDate: string, checkOutDate: string) {
    // 1. Find the guest ID for this user
    const guests = await Database.select<{ id: number }>('guests', '*', { user_id: userId });
    if (!guests.length) throw new Error('Guest profile not found');
    const guestId = guests[0].id;

    // 2. Get property details
    const properties = await Database.select<{ id: number; price_per_night: number }>('properties', '*', { id: propertyId });
    if (!properties.length) throw new Error('Property not found');
    const property = properties[0];

    // 3. Check if available using RPC
    const available = await Database.query<{ check_property_availability: boolean }>(
      'SELECT check_property_availability($1, $2, $3) AS check_property_availability',
      [propertyId, checkInDate, checkOutDate]
    );

    if (!available[0]?.check_property_availability) {
      throw new Error('Property is not available for the selected dates');
    }

    // 4. Calculate total price
    const nights = Math.ceil(
      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalPrice = Number(property.price_per_night) * nights;

    // 5. Create the booking
    const booking = await Database.insert('bookings', {
      property_id: propertyId,
      guest_id: guestId,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      total_price: totalPrice,
      status: 'pending'
    });

    return booking;
  }
}

export default new BookingService();
