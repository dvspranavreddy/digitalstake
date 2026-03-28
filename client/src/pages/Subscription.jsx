import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionService } from '../services/endpoints';
import { useAuth } from '../context/AuthContext';
import './Subscription.css';

const Subscription = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState('');
  const [currentSub, setCurrentSub] = useState(null);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    subscriptionService.getPlans().then(res => setPlans(res.data)).catch(() => {});
    if (user) {
      subscriptionService.getStatus().then(res => setCurrentSub(res.data)).catch(() => {});
    }
  }, [user]);

  const getDaysUntilExpiry = () => {
    if (!currentSub?.subscription?.expires_at) return null;
    const expiresAt = new Date(currentSub.subscription.expires_at);
    const now = new Date();
    const diffDays = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysToExpiry = getDaysUntilExpiry();
  const isExpiringSoon = daysToExpiry !== null && daysToExpiry <= 7 && daysToExpiry >= 0;
  const preventNewSub = currentSub?.status === 'active' && !isExpiringSoon;

  const handleSubscribe = async (planType) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setError('');
    setLoading(planType);
    try {
      const { data } = await subscriptionService.createOrder(planType);
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'DigitalStake',
        description: data.plan.label,
        order_id: data.order.id,
        handler: async (response) => {
          try {
            await subscriptionService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_type: planType,
            });
            navigate('/dashboard');
          } catch (err) {
            setError('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user?.full_name,
          email: user?.email,
          contact: '9999999999',  // test-mode placeholder
        },
        theme: { color: '#6ee7b7' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setError('Payment failed. Please try again.');
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create order');
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="subscription-page" id="subscription-page">
      <div className="sub-container">
        <h1 className="sub-title">Choose Your Plan</h1>
        <p className="sub-subtitle">Unlock draws, track scores, and support charities</p>

        {currentSub?.status === 'active' && (
          <div className="sub-active-badge" style={{ backgroundColor: isExpiringSoon ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: isExpiringSoon ? '#991b1b' : '#065f46', border: `1px solid ${isExpiringSoon ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}` }}>
            {isExpiringSoon ? '⚠️' : '✓'} You have an active {currentSub.subscription?.plan_type} subscription 
            (expires {new Date(currentSub.subscription?.expires_at).toLocaleDateString()})
            {isExpiringSoon && ' — You can renew now!'}
          </div>
        )}

        {error && <div className="sub-error">{error}</div>}

        <div className="plans-grid">
          {plans.map(plan => (
            <div key={plan.id} className={`plan-card ${plan.id === 'yearly' ? 'plan-featured' : ''}`}>
              {plan.id === 'yearly' && <div className="plan-badge">Best Value</div>}
              <h2 className="plan-name">{plan.name}</h2>
              <div className="plan-price">
                <span className="plan-amount">{plan.display_price}</span>
                <span className="plan-period">/{plan.id === 'monthly' ? 'month' : 'year'}</span>
              </div>
              {plan.id === 'yearly' && (
                <div className="plan-savings">Save ₹{((499 * 12 - 4990)).toLocaleString('en-IN')} vs monthly</div>
              )}
              <ul className="plan-features">
                <li>Monthly prize draw entry</li>
                <li>Score tracking (5 rolling)</li>
                <li>Charity support (&gt;10%)</li>
                <li>Dashboard access</li>
                <li>Winner verification</li>
                {plan.id === 'yearly' && <li>Priority support</li>}
              </ul>
              <button
                className="btn-primary plan-cta"
                onClick={() => handleSubscribe(plan.id)}
                disabled={!!loading || preventNewSub}
                id={`subscribe-${plan.id}`}
              >
                {loading === plan.id ? 'Processing...' : preventNewSub ? 'Active Plan' : (currentSub?.status === 'active' ? 'Renew Plan' : 'Subscribe Now')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Subscription;
