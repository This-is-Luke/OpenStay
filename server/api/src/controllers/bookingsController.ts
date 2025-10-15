import  { Request, Response } from 'express';
import { 
  ApiResponse, 
  CreateBookingRequest, 

} from '../types';
import propertyService from '../services/propertyService';
import bookingService from '../services/bookingService';

export const CreateABooking = async (req: Request<{}, {}, CreateBookingRequest>, res: Response<ApiResponse>) => {

 try {
     const { userId, listingPda, guestPublicKey, propertyId, checkInDate, checkOutDate } = req.body;


    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    if (checkOut <= checkIn) {
      return res.status(400).json({ success: false, message: 'Check-out date must be after check-in date' });
    }
    const isAvailable = await propertyService.checkAvailability(propertyId, checkIn, checkOut);
    if (!isAvailable) {
      return res.status(400).json({ success: false, message: 'Property is not available for these dates' });
    }

    const booking = await bookingService.createBooking(listingPda, guestPublicKey, userId, propertyId, checkIn, checkOut);

    return res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Booking error:', error);
    return res.status(400).json({
      success: false,
      message: (error as Error).message
    });
  }
}
export const RefundPayment = async (req: Request, res: Response<ApiResponse>) => {
  try {
    const { bookingId } = req.params;
    const { txSignature, guestPublicKey } = req.body;

    const result = await bookingService.refundPayment(bookingId, txSignature, guestPublicKey);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Refund payment error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const ReleasePayment = async (req: Request, res: Response<ApiResponse>) => {
  try {
    const { bookingId } = req.params;
    const { txSignature, hostPublicKey } = req.body;

    const result = await bookingService.releasePayment(bookingId, txSignature, hostPublicKey);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Release payment error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const ConfirmBooking = async (req: Request, res: Response<ApiResponse>) => {
  try {
    const { bookingId, txSignature, listingPda, escrowPda, guestPublicKey } = req.body;

    if (!bookingId || !txSignature || !listingPda || !escrowPda || !guestPublicKey) {
      throw new Error('Missing required parameters');
    }

    const result = await bookingService.confirmBooking(
      bookingId,
      txSignature,
      listingPda,
      escrowPda,
      guestPublicKey
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Confirm booking error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};