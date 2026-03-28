import { Link } from 'react-router-dom';
import './HowItWorks.css';

const HowItWorks = () => {
  return (
    <div className="how-it-works-page">
      {/* Hero Section */}
      <section className="hiw-hero">
        <div className="hiw-hero-content">
          <div className="hiw-badge">✦ Transparent. Fair. Rewarding.</div>
          <h1 className="hiw-title">
            Draw <span className="hiw-gradient">Mechanics</span> — Explained
          </h1>
          <p className="hiw-subtitle">
            Everything you need to know about entering your scores, how the monthly draw operates, and how prizes are distributed.
          </p>
        </div>
        <div className="hiw-hero-glow"></div>
      </section>

      {/* Steps Section */}
      <section className="hiw-steps">
        <div className="hiw-container">
          <div className="hiw-steps-grid">
            
            <div className="hiw-step-box">
              <div className="hiw-step-box-header">
                <span className="hiw-step-num">Step 01</span>
              </div>
              <h2>Subscribe</h2>
              <p>
                To enter, pick a monthly or yearly plan. A minimum of 10% automatically goes to your chosen charity.
              </p>
              <ul className="hiw-list">
                <li><span>✦</span> <strong>Plans:</strong> From ₹499/month.</li>
              </ul>
            </div>

            <div className="hiw-step-box">
              <div className="hiw-step-box-header">
                <span className="hiw-step-num">Step 02</span>
              </div>
              <h2>Log Scores</h2>
              <p>
                Log 5 Stableford scores (1–45). When you log a 6th score, it simply replaces your oldest one.
              </p>
              <ul className="hiw-list">
                <li><span>✦</span> <strong>Validation:</strong> Exact 5 scores needed.</li>
              </ul>
            </div>

            <div className="hiw-step-box">
              <div className="hiw-step-box-header">
                <span className="hiw-step-num">Step 03</span>
              </div>
              <h2>Win Prizes</h2>
              <p>
                At month's end, 5 unique balls are randomly drawn. Match 3, 4, or all 5 numbers to win!
              </p>
              <ul className="hiw-list">
                <li><span>✦</span> <strong>Payouts:</strong> Automated verifications.</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Prize Distribution */}
      <section className="hiw-prizes">
        <div className="hiw-container">
          <h2 className="hiw-section-title">Prize Pool Breakdown</h2>
          <p className="hiw-section-subtitle">
            50% of all subscription revenue funds the Prize Pool. Here is how it is distributed:
          </p>
          
          <div className="hiw-tiers-grid">
            <div className="hiw-tier-card gold">
              <div className="hiw-tier-header">
                <h3>5 Number Match</h3>
                <span className="hiw-tier-pct">40%</span>
              </div>
              <p className="hiw-tier-desc">The Jackpot! Match all 5 randomly drawn numbers.</p>
              <div className="hiw-tier-feature">✦ Rolls over to the next month if unclaimed!</div>
              <div className="hiw-glow"></div>
            </div>
            
            <div className="hiw-tier-card silver">
              <div className="hiw-tier-header">
                <h3>4 Number Match</h3>
                <span className="hiw-tier-pct">35%</span>
              </div>
              <p className="hiw-tier-desc">Match any 4 of the 5 drawn numbers.</p>
              <div className="hiw-tier-feature">Split equally among all 4-match winners</div>
            </div>

            <div className="hiw-tier-card bronze">
              <div className="hiw-tier-header">
                <h3>3 Number Match</h3>
                <span className="hiw-tier-pct">25%</span>
              </div>
              <p className="hiw-tier-desc">Match any 3 of the 5 drawn numbers.</p>
              <div className="hiw-tier-feature">Split equally among all 3-match winners</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="hiw-faq">
        <div className="hiw-container">
          <h2 className="hiw-section-title">Frequently Asked Questions</h2>
          <div className="hiw-faq-grid">
            <div className="hiw-faq-item">
              <h4>What happens if I enter less than 5 scores?</h4>
              <p>You must have exactly 5 scores linked to your profile to be entered into the draw. Ensure you log sufficient plays otherwise your entry will be skipped for the month!</p>
            </div>
            <div className="hiw-faq-item">
              <h4>Can I have duplicate numbers in my scores?</h4>
              <p>Absolutely. If you shoot 32 points on three different days, 32 will represent three of your entry numbers. However, the system draw only releases unique numbers.</p>
            </div>
            <div className="hiw-faq-item">
              <h4>When do I get paid if I win?</h4>
              <p>Our admin team validates all winning entries within 48 hours. Once verified, payments are remitted directly to your associated account.</p>
            </div>
            <div className="hiw-faq-item">
              <h4>How much goes to Charity?</h4>
              <p>A minimum of 10% of your gross subscription fee goes directly to the charity you select during checkout.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" id="cta-section">
        <div className="section-container">
          <div className="cta-card">
            <h2>Ready to Start Playing?</h2>
            <p>Join DigitalStake now, log your scores, and make an impact.</p>
            <Link to="/subscription" className="btn-primary btn-large" id="hiw-subscribe-btn">
              Start Subscription →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;
