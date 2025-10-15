
import express from 'express';

import { ConfirmBooking, CreateABooking, RefundPayment, ReleasePayment } from '../controllers/bookingsController';

const router = express.Router();

// @route   POST /booking/:userId/:propertyId
// @desc    Creates a new booking for a given property by a user
// @access  Public
router.post('/:userId/:propertyId', CreateABooking); 
// @route   PATCH api/booking/:userId/:bookingId/confirm
// @desc    Confirms a booking with the signed signature from the user
// @access  Public
router.patch('/:userId/:bookingId/confirm', ConfirmBooking);

// @route   POST /api/:userId/:bookingId/checkIn
// @desc    ReleasesPayment a booking with the signed signature from the host
// @access  Public
router.post('/:userId/:bookingId/checkIn', ReleasePayment); 

// @route   DELETE /api/:userId/:bookingId
// @desc    Refunds a booking with the signed signature from the guest
// @access  Public
router.delete('/:userId/:bookingId',RefundPayment); 

export default router;
