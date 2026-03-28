import { Link } from 'react-router-dom';
import './SubscriptionGate.css';

const SubscriptionGate = ({ title, message }) => {
  return (
    <div className="sub-gate-page">
      <div className="sub-gate-container">
        <div className="sub-gate-card">
          <div className="sub-gate-icon-lock"></div>
          <h2 className="sub-gate-title">{title || "Subscribers Only"}</h2>
          <p className="sub-gate-message">
            {message || "You're not subscribed yet. Subscribe to unlock all premium features and benefits!"}
          </p>
          <div className="sub-gate-benefits">
            <div className="sub-gate-benefit">
              <span className="benefit-dot"></span>
              <span>Track & manage your scores</span>
            </div>
            <div className="sub-gate-benefit">
              <span className="benefit-dot"></span>
              <span>Enter monthly prize draws</span>
            </div>
            <div className="sub-gate-benefit">
              <span className="benefit-dot"></span>
              <span>Choose & switch charities</span>
            </div>
            <div className="sub-gate-benefit">
              <span className="benefit-dot"></span>
              <span>Access winnings dashboard</span>
            </div>
            <div className="sub-gate-benefit">
              <span className="benefit-dot"></span>
              <span>Full dashboard experience</span>
            </div>
          </div>
          <Link to="/subscription" className="sub-gate-cta" id="subscribe-gate-btn">
            Subscribe Now
          </Link>
          <p className="sub-gate-pricing">Plans start at just ₹499/month</p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionGate;
