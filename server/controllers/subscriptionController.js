const getRazorpay = require('../config/razorpay');
const crypto = require('crypto');
const supabase = require('../config/supabase');

const PLANS = {
  monthly: { amount: 49900,  label: 'Monthly Plan', duration_days: 30  },  // ₹499
  yearly:  { amount: 499000, label: 'Yearly Plan',  duration_days: 365 },  // ₹4,990
};

exports.getPlans = (req, res, next) => {
  try {
    const plans = Object.entries(PLANS).map(([key, val]) => ({
      id: key,
      name: val.label,
      amount: val.amount,
      duration_days: val.duration_days,
      display_price: `₹${(val.amount / 100).toLocaleString('en-IN')}`,
    }));
    res.json(plans);
  } catch (err) {
    next(err);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const { plan_type } = req.body;
    const plan = PLANS[plan_type];
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Check if user already has an active subscription
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'active');

    if (existing && existing.length > 0) {
      const currentSub = existing[0];
      const expiresAt = new Date(currentSub.expires_at);
      const now = new Date();
      const diffDays = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
      
      if (diffDays > 7) {
        return res.status(400).json({ error: 'You already have an active subscription that does not expire soon.' });
      }
    }

    const shortId = req.user.id.replace(/-/g, '').slice(-8);
    const epochSec = Math.floor(Date.now() / 1000);
    const receipt = `sub_${shortId}_${epochSec}`;

    const options = {
      amount: plan.amount,
      currency: 'INR',
      receipt
    };

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create(options);

    res.json({ order, plan });
  } catch (err) {
    next(err);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_type } = req.body;
    
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    const plan = PLANS[plan_type];
    if (!plan) {
      return res.status(404).json({ error: 'Invalid plan type' });
    }

    // Check for an existing active subscription to roll over remaining days
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'active');

    const now = new Date();
    let baseDate = new Date(now);

    if (existing && existing.length > 0) {
      const existingSub = existing[0];
      const currentExpiry = new Date(existingSub.expires_at);
      
      if (currentExpiry > now) {
        // Roll over remaining days: start adding duration from the current expiry date
        baseDate = currentExpiry;
      }
      
      // Deactivate old subscription
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', req.user.id)
        .eq('status', 'active');
    }

    const expiresAt = new Date(baseDate);
    expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

    // Create new subscription enrollment
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: req.user.id,
        plan_type: plan_type,
        status: 'active',
        razorpay_order_id,
        razorpay_payment_id,
        amount: plan.amount,
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Attempt to log charity accrual — non-fatal if table doesn't exist yet
    try {
      const { data: user } = await supabase
        .from('users')
        .select('charity_id, charity_contribution_pct')
        .eq('id', req.user.id)
        .single();

      if (user && user.charity_id) {
        await supabase.from('subscription_charity_logs').insert({
          user_id: req.user.id,
          subscription_id: subscription.id,
          charity_id: user.charity_id,
          contribution_pct: user.charity_contribution_pct || 10,
          start_date: now.toISOString(),
          end_date: expiresAt.toISOString()
        });
      }
    } catch (logErr) {
      // Ledger table may not exist yet — subscription still succeeds
      console.warn('Could not write to subscription_charity_logs:', logErr.message);
    }

    res.json({ success: true, message: 'Payment verified and enrolled successfully', subscription });

  } catch (err) {
    next(err);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    if (!data || data.length === 0) {
      return res.json({ status: 'none', subscription: null });
    }

    const sub = data[0];
    const isExpired = new Date(sub.expires_at) < new Date();
    
    if (isExpired && sub.status === 'active') {
      await supabase
        .from('subscriptions')
        .update({ status: 'lapsed' })
        .eq('id', sub.id);
      sub.status = 'lapsed';
    }

    res.json({ status: sub.status, subscription: sub });
  } catch (err) {
    next(err);
  }
};
