const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    const supabase = require('../config/supabase');
    
    // Lifecycle: Handle lapsed-subscription states
    await supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString());

    // Validation: Real-time subscription status check
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    req.user.has_active_subscription = data && data.length > 0;
    if (req.user.has_active_subscription) {
      req.subscription = data[0];
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requireActiveSubscription = (req, res, next) => {
  if (!req.user.has_active_subscription) {
    return res.status(403).json({ error: 'Active subscription required' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireActiveSubscription };
