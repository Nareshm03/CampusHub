const express = require('express');
const {
  createFee,
  getStudentFees,
  getMyFees,
  recordPayment,
  getFeeSummary,
  createPaymentIntent,
  stripeWebhook,
  sendPaymentReminder
} = require('../controllers/feeController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Stripe webhook must receive the raw body — mount before any JSON body-parser
// express.raw() is applied per-route so it doesn't affect other routes
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhook
);

router.get('/summary', protect, authorize('ADMIN'), getFeeSummary);
router.get('/my', protect, authorize('STUDENT'), getMyFees);
router.post('/', protect, authorize('ADMIN'), createFee);
router.get('/student/:studentId', protect, getStudentFees);
router.post('/:feeId/payment', protect, authorize('ADMIN'), recordPayment);
router.post('/:feeId/create-payment-intent', protect, createPaymentIntent);
router.post('/:feeId/remind', protect, authorize('ADMIN'), sendPaymentReminder);

module.exports = router;
