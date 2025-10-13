import express, { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import bookingService from '../services/bookingService';

const router = express.Router();

router.post('/', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const { propertyId, checkInDate, checkOutDate } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const booking = await bookingService.createBooking(userId, propertyId, checkInDate, checkOutDate);

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(400).json({
      success: false,
      message: (error as Error).message
    });
  }
});

export default router;
