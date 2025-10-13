import express from 'express';
import {
  initializeEscrow,
  depositToEscrow,
  releaseEscrow,
  refundEscrow,
  getPaymentStatus
} from '../controllers/paymentControllers';

const router = express.Router();

router.post('/init', initializeEscrow);
router.post('/deposit', depositToEscrow);
router.post('/release', releaseEscrow);
router.post('/refund', refundEscrow);
router.get('/:bookingId/status', getPaymentStatus);

export default router;
