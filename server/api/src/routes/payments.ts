import express from 'express';
import {
  initializeEscrow,
  depositToEscrow,
  releaseEscrow,
,
  getPaymentStatus
} from '../controllers/paymentControllers';

const router = express.Router();


router.post('/:listingID/:walletID/checkIn', releaseEscrow);


export default router;
