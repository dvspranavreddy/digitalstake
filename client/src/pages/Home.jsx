import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { charityService, subscriptionService, scoreService, winnerService, drawService } from '../services/endpoints';
import './Home.css';

/* ───────────────────────────────────────────
   SUBSCRIBER HOME (Dashboard View)
─────────────────────────────────────────── */
const SubscriberHome = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [scores, setScores] = useState([]);
  const [winnings, setWinnings] = useState([]);
  const [draws, setDraws] = useState([]);
  const [charity, setCharity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [subRes, scoresRes, winRes, drawsRes] = await Promise.all([
          subscriptionService.getStatus(),
          scoreService.getScores(),
          winnerService.getMyWinnings(),
          drawService.getAll(),
        ]);
        
        setSubscription(subRes.data);
        setScores(scoresRes.data);
        setWinnings(winRes.data);
        setDraws(drawsRes.data);

        if (user?.charity_id) {
          const charityRes = await charityService.getById(user.charity_id);
          setCharity(charityRes.data);
        }
      } catch (err) {
        console.error('Home Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [user]);

  const isActive = subscription?.status === 'active';
  const scoresReady = scores.length === 5;
  const firstName = user?.nickname || user?.full_name?.split(' ')[0] || 'Player';
  
  // Calculate days until subscription expires
  const getDaysUntilExpiry = () => {
    if (!subscription?.subscription?.expires_at) return null;
    const expiresAt = new Date(subscription.subscription.expires_at);
    const now = new Date();
    const diffTime = expiresAt - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const daysToExpiry = getDaysUntilExpiry();
  const showExpiryWarning = isActive && daysToExpiry !== null && daysToExpiry <= 7 && daysToExpiry >= 0;

  const totalWon = winnings.reduce((sum, w) => sum + (w.prize_amount || 0), 0);
  const publishedDrawsCount = draws.filter(d => d.status === 'published').length;

  if (loading) {
    return (
      <div className="home-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="home home-subscriber" id="home-page">
      {/* 1. Personalized Hero */}
      <section className="sub-hero" id="sub-hero">
        <div className="hero-bg-effects">
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-orb hero-orb-3"></div>
        </div>
        <div className="sub-hero-content">
          <div className="hero-badge">Welcome back, {firstName}!</div>
          <h1 className="hero-title">
            Your Dashboard,<br />
            <span className="hero-gradient">Your Journey.</span>
          </h1>
          <p className="hero-subtitle">
            Track your scores, monitor your draws, and see the impact your subscription is making.
          </p>
        </div>
      </section>

      {/* 2. Unified Status & Stats Strip */}
      <section className="sub-overview-section" id="sub-overview">
        <div className="section-container">
          <div className="sub-overview-grid">
            {/* Status Pills */}
            <div className="overview-group">
              <h3 className="overview-label">Live Status</h3>
              <div className="status-strip-grid">
                <div className={`status-pill ${isActive ? 'status-pill-green' : 'status-pill-red'}`}>
                  <span className="status-dot"></span>
                  <span>Subscription: <strong>{isActive ? 'Active' : 'Inactive'}</strong></span>
                </div>
                <div className={`status-pill ${scoresReady ? 'status-pill-green' : 'status-pill-amber'}`}>
                  <span className="status-dot"></span>
                  <span>Scores: <strong>{scores.length}/5 {scoresReady ? 'Ready ✓' : 'Needed'}</strong></span>
                </div>
              </div>
            </div>

            {/* Key Statistics */}
            <div className="overview-group">
              <h3 className="overview-label">Your Impact & Wins</h3>
              <div className="stats-strip-grid">
                <div className="stat-pill">
                  <span className="stat-pill-label">Total Won</span>
                  <span className="stat-pill-value">₹{(totalWon / 100).toLocaleString('en-IN')}</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-pill-label">Draws Played</span>
                  <span className="stat-pill-value">{publishedDrawsCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Main Dashboard Grid (Uniform Cards) */}
      <section className="sub-dashboard-grid-section">
        <div className="section-container">
          <div className="dash-grid">
            {/* Scores Card */}
            <div className="dash-card">
              <div className="dash-card-header">
                <h2>Your Recent Scores</h2>
                <Link to="/scores" className="dash-link">Manage →</Link>
              </div>
              {scores.length > 0 ? (
                <div className="scores-list">
                  {scores.map(s => (
                    <div key={s.id} className="score-item">
                      <span className="score-value">{s.score}</span>
                      <span className="score-date">{new Date(s.played_date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dash-empty">
                  <p>No scores entered yet</p>
                  <Link to="/scores" className="btn-primary btn-sm">Add Scores</Link>
                </div>
              )}
            </div>

            {/* Winnings Card */}
            <div className="dash-card">
              <div className="dash-card-header">
                <h2>Recent Winnings</h2>
                <Link to="/winnings" className="dash-link">View All →</Link>
              </div>
              {winnings.length > 0 ? (
                <div className="winnings-list">
                  {winnings.map(w => (
                    <div key={w.id} className="winning-item">
                      <div className="winning-info">
                        <span className="winning-type">{w.match_type} Match</span>
                        <span className="winning-date">{new Date(w.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="winning-meta">
                        <span className="winning-amount">₹{(w.prize_amount / 100).toLocaleString('en-IN')}</span>
                        <span className={`winning-status ws-${w.payment_status}`}>{w.payment_status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dash-empty">
                  <p>No winnings yet. Keep playing!</p>
                </div>
              )}
            </div>

            {/* Subscription Card */}
            <div className="dash-card">
              <div className="dash-card-header">
                <h2>Subscription</h2>
                <Link to="/subscription" className="dash-link">Details →</Link>
              </div>
              {subscription?.subscription ? (
                <div className="sub-summary-card" style={{ flex: 1, overflowY: 'auto' }}>
                  {showExpiryWarning && (
                    <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#991b1b', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>⚠️</span> Action Required
                      </strong>
                      <span style={{ lineHeight: '1.4' }}>Your plan expires in {daysToExpiry} {daysToExpiry === 1 ? 'day' : 'days'}. <Link to="/subscription" style={{ color: '#e11d48', fontWeight: 'bold' }}>Renew now</Link> to stay in the next draw!</span>
                    </div>
                  )}
                  <div className="sub-row">
                    <span>Plan</span>
                    <span className="sub-val">{subscription.subscription.plan_type}</span>
                  </div>
                  <div className="sub-row">
                    <span>Expires</span>
                    <span className="sub-val">{new Date(subscription.subscription.expires_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ) : (
                <div className="dash-empty" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <p>No active subscription</p>
                  <Link to="/subscription" className="btn-primary btn-sm">Subscribe Now</Link>
                </div>
              )}
            </div>

            {/* Charity Card */}
            <div className="dash-card">
              <div className="dash-card-header">
                <h2>Your Charity Impact</h2>
                <Link to="/charities" className="dash-link">Change →</Link>
              </div>
              {charity ? (
                <div className="charity-detail-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                  <img 
                    src={(charity.name.includes('Young') || charity.name.includes('Youth')) && charity.name.includes('Sports') ? '/young_sports_foundation.png' : (charity.image_url || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400')} 
                    alt={charity.name} 
                    style={{ width: '100%', height: '140px', minHeight: '140px', borderRadius: '8px', objectFit: 'cover' }} 
                  />
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>{charity.name}</h3>
                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                      You are contributing <strong>{user?.charity_contribution_pct}%</strong> of your subscription to support this cause.
                    </p>
                    <div style={{ marginTop: '0.8rem', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', height: '12px', overflow: 'hidden' }}>
                      <div style={{ width: `${user?.charity_contribution_pct || 10}%`, height: '100%', background: 'linear-gradient(90deg, #e11d48, #f43f5e)', borderRadius: '10px', transition: 'width 0.5s ease-in-out' }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                      <span>10%</span>
                      <span>Contribution Scale</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="dash-empty" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px dashed #ef4444' }}>
                  <span style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>⚠️ Action Required</span>
                  <p style={{ color: '#991b1b', marginBottom: '1rem', fontWeight: 'bold' }}>Selecting a charity is mandatory.</p>
                  <Link to="/charities" className="btn-primary btn-sm" style={{ alignSelf: 'center' }}>Set Up My Charity Impact</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Renew Block if inactive */}
      {!isActive && !loading && (
        <section className="sub-upsell-section" id="sub-upsell">
          <div className="section-container">
            <div className="cta-card">
              <h2>Your Subscription Has Lapsed</h2>
              <p>Renew now to stay in the next monthly draw and continue supporting your chosen charity.</p>
              <Link to="/subscription" className="btn-primary btn-large" id="renew-btn">
                Renew Subscription →
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

/* ───────────────────────────────────────────
   PUBLIC HOME  (shown to guests)
─────────────────────────────────────────── */
const PublicHome = () => {
  const [featuredCharities, setFeaturedCharities] = useState([]);

  useEffect(() => {
    charityService.getFeatured()
      .then(res => setFeaturedCharities(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="home" id="home-page">
      {/* Hero Section */}
      <section className="hero" id="hero-section">
        <div className="hero-bg-effects">
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-orb hero-orb-3"></div>
        </div>
        <div className="hero-content">
          <div className="hero-badge">A new way to make an impact</div>
          <h1 className="hero-title">
            Your Scores.<br />
            <span className="hero-gradient">Real Prizes.</span><br />
            Lasting Impact.
          </h1>
          <p className="hero-subtitle">
            Join a community where every golf score you enter could win you cash prizes — and every <Link to="/subscription" className="text-link">subscription</Link> directly supports the charities you choose.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn-primary" id="hero-cta">Start Playing →</Link>
            <Link to="/charities" className="btn-secondary">Explore Charities</Link>
          </div>

        </div>
      </section>

      {/* How It Works / Mechanics */}
      <section className="how-it-works" id="how-it-works">
        <div className="section-container">
          <h2 className="section-title">Your Path to Winning</h2>
          <p className="section-subtitle">Three simple steps to start winning and giving</p>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <h3>Subscribe & Choose</h3>
              <p>Pick a monthly or yearly plan and select a charity to support. At least 10% of your subscription goes directly to your chosen cause.</p>
            </div>
            <div className="step-card">
              <div className="step-number">02</div>
              <h3>Enter Your Scores</h3>
              <p>Log your latest 5 Stableford golf scores (1–45). These become your numbers for the monthly prize draw.</p>
            </div>
            <div className="step-card">
              <div className="step-number">03</div>
              <h3>Win & Impact</h3>
              <p>Match 3, 4, or all 5 numbers in the monthly draw to win from the prize pool. No 5-match? The jackpot rolls over!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Prize Tiers */}
      <section className="prize-section" id="prize-section">
        <div className="section-container">
          <h2 className="section-title">Prize Pool Distribution</h2>
          <p className="section-subtitle">Every month, the pool is split across three tiers</p>
          <div className="prize-grid">
            <div className="prize-card prize-gold">
              <div className="prize-tier">5 Number Match</div>
              <div className="prize-pct">40%</div>
              <div className="prize-detail">Jackpot • Rolls over if unclaimed</div>
              <div className="prize-glow"></div>
            </div>
            <div className="prize-card prize-silver">
              <div className="prize-tier">4 Number Match</div>
              <div className="prize-pct">35%</div>
              <div className="prize-detail">Split equally among winners</div>
            </div>
            <div className="prize-card prize-bronze">
              <div className="prize-tier">3 Number Match</div>
              <div className="prize-pct">25%</div>
              <div className="prize-detail">Split equally among winners</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Charities */}
      {featuredCharities.length > 0 && (
        <section className="charities-section" id="featured-charities">
          <div className="section-container">
            <h2 className="section-title">Featured Charities</h2>
            <p className="section-subtitle">Your subscription makes a real difference</p>
            <div className="charity-grid">
              {featuredCharities.slice(0, 3).map(charity => (
                <div className="charity-card" key={charity.id}>
                  <div className="charity-image" style={{
                    backgroundImage: `url(${(charity.name.includes('Young') || charity.name.includes('Youth')) && charity.name.includes('Sports') ? '/young_sports_foundation.png' : (charity.image_url || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400')})`
                  }}></div>
                  <div className="charity-info">
                    <h3>{(charity.name.includes('Young') || charity.name.includes('Youth')) && charity.name.includes('Sports') ? 'Young Sports Foundation' : charity.name}</h3>
                    <p>{charity.description?.substring(0, 100)}...</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/charities" className="btn-outline" id="view-all-charities">View All Charities →</Link>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="cta-section" id="cta-section">
        <div className="section-container">
          <div className="cta-card">
            <h2>Ready to Make Every Score Count?</h2>
            <p>Join thousands of players who are winning prizes and changing lives.</p>
            <Link to="/subscription" className="btn-primary btn-large" id="bottom-cta">
              Subscribe Now — From ₹499/month
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

/* ───────────────────────────────────────────
   MAIN EXPORT — routes based on auth state
─────────────────────────────────────────── */
const Home = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <SubscriberHome /> : <PublicHome />;
};

export default Home;
