const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { 
  getPlans, 
  createOrder, 
  verifyPayment, 
  getStatus 
} = require('../controllers/subscriptionController');

const router = express.Router();

// validation middleware patterned after friend's code
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // using similar format to friend's return style
    return res.status(400).json({ errors: errors.array(), error: 'Validation failed' });
  }
  next();
}

router.get('/plans', getPlans);

router.post('/create-order', 
  authenticate, 
  [
    body('plan_type').isIn(['monthly', 'yearly']).withMessage('Plan type must be monthly or yearly')
  ], 
  validate, 
  createOrder
);

router.post('/verify-payment', 
  authenticate, 
  [
    body('razorpay_order_id').notEmpty().withMessage('Order ID is required'),
    body('razorpay_payment_id').notEmpty().withMessage('Payment ID is required'),
    body('razorpay_signature').notEmpty().withMessage('Signature is required'),
    body('plan_type').isIn(['monthly', 'yearly']).withMessage('Plan type must be monthly or yearly')
  ], 
  validate, 
  verifyPayment
);

router.get('/status', authenticate, getStatus);

module.exports = router;
