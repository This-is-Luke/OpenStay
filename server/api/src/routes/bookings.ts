import express, { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import bookingService from '../services/bookingService';

const router = express.Router();

// Create a booking
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



router.post('/:userId/:bookingId/checkIn', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const userId = req.user?.id;
    const { bookingId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const updatedBooking = await bookingService.checkInBooking(userId, bookingId);

    res.json({
      success: true,
      data: updatedBooking
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(400).json({
      success: false,
      message: (error as Error).message
    });
  }
});

router.delete('/:userId/:bookingId', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const userId = req.user?.id;
    const { bookingId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    await bookingService.deleteBooking(userId, bookingId);

    res.json({
      success: true,
      message: 'Booking cancelled successfully'
    });
  } catch (error) {
    console.error('Delete booking error:', error);
    res.status(400).json({
      success: false,
      message: (error as Error).message
    });
  }
});

export default router;
