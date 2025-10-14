import express from 'express';
import {
  initializeEscrow,
  depositToEscrow,
  releaseEscrow,
  refundEscrow,
  getPaymentStatus
} from '../controllers/paymentControllers';

const router = express.Router();


router.post('/:listingID/:walletID/checkIn', refundEscrow);


export default router;
