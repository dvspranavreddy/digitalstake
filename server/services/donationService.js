const getRazorpay = require('../config/razorpay');
const crypto = require('crypto');
const supabase = require('../config/supabase');

/**
 * Create a Razorpay order for a one-off donation
 */
const createDonationOrder = async (userId, { charityId, amount }) => {
  if (!amount || amount < 100) {
    throw new Error('Minimum donation amount is ₹1');
  }

  // Verify charity exists
  const { data: charity, error: cError } = await supabase
    .from('charities')
    .select('id, name')
    .eq('id', charityId)
    .single();

  if (cError || !charity) throw new Error('Charity not found');

  const razorpay = getRazorpay();
  const shortId = userId.replace(/-/g, '').slice(-8);
  const epochSec = Math.floor(Date.now() / 1000);
  
  const options = {
    amount: Math.round(amount), // In paise
    currency: 'INR',
    receipt: `don_${shortId}_${epochSec}`,
    notes: {
      userId,
      charityId,
      charityName: charity.name,
      type: 'one_off_donation'
    }
  };

  const order = await razorpay.orders.create(options);

  // Record pending donation
  const { data: donation, error: dError } = await supabase
    .from('donations')
    .insert({
      user_id: userId,
      charity_id: charityId,
      amount: Math.round(amount),
      razorpay_order_id: order.id,
      status: 'pending'
    })
    .select()
    .single();

  if (dError) throw new Error(dError.message);

  return { order, donation };
};

/**
 * Verify donation payment and update status
 */
const verifyDonationPayment = async (userId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    // Mark as failed in DB
    await supabase
      .from('donations')
      .update({ status: 'failed' })
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', userId);
      
    throw new Error('Payment verification failed');
  }

  // Update donation record
  const { data: donation, error } = await supabase
    .from('donations')
    .update({
      razorpay_payment_id,
      status: 'completed'
    })
    .eq('razorpay_order_id', razorpay_order_id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return donation;
};

module.exports = {
  createDonationOrder,
  verifyDonationPayment
};
