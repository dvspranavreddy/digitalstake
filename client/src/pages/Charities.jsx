import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { charityService, authService } from '../services/endpoints';
import { useAuth } from '../context/AuthContext';
import './Charities.css';

const Charities = () => {
  const { user, updateUser, hasActiveSubscription } = useAuth();
  const [charities, setCharities] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedCharity, setSelectedCharity] = useState(null);
  const [donationAmount, setDonationAmount] = useState(500);
  const [isDonating, setIsDonating] = useState(false);
  const [totalDonations, setTotalDonations] = useState(null);
  const [totalDonationsLoading, setTotalDonationsLoading] = useState(false);

  const isSubscribed = user ? hasActiveSubscription : false;

  useEffect(() => {
    if (selectedCharity) {
      setTotalDonationsLoading(true);
      charityService.getTotalDonations(selectedCharity.id)
        .then(res => setTotalDonations(res.data))
        .catch(() => setTotalDonations(null))
        .finally(() => setTotalDonationsLoading(false));
    } else {
      setTotalDonations(null);
    }
  }, [selectedCharity]);

  useEffect(() => {
    charityService.getAll()
      .then(res => setCharities(res.data))
      .catch(() => {});
  }, []);

  const filtered = charities.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'featured' && c.featured);
    return matchesSearch && matchesFilter;
  });

  const handleCharityClick = (charity) => {
    setSelectedCharity(charity);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDonate = async () => {
    if (!user) {
      alert('Please log in to donate');
      return;
    }

    setIsDonating(true);
    try {
      const amountInPaise = donationAmount * 100;
      const { data } = await charityService.createDonationOrder({
        charityId: selectedCharity.id,
        amount: amountInPaise
      });

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: 'INR',
        name: 'DigitalStake',
        description: `Donation to ${selectedCharity.name}`,
        order_id: data.order.id,
        handler: async (response) => {
          try {
            await charityService.verifyDonationPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            alert('Thank you for your generous donation!');
            setDonationAmount(500);
          } catch (err) {
            alert('Verification failed, please contact support');
          }
        },
        prefill: {
          name: user.full_name,
          email: user.email
        },
        theme: { color: '#fb7185' }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert('Failed to initiate donation: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsDonating(false);
    }
  };

  return (
    <div className="charities-page" id="charities-page">
      <div className="charities-container">
        <header className="charities-header">
          <h1>Charity Directory</h1>
          <p className="charities-subtitle">Discover and support incredible causes making a difference. From education to conservation, every stake helps.</p>
        </header>

        <div className="charities-controls">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="charities-search"
              placeholder="Search charities by name or cause..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="charity-search"
            />
          </div>
          <div className="filter-group">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`} 
              onClick={() => setFilter('all')}
            >
              All Causes
            </button>
            <button 
              className={`filter-btn ${filter === 'featured' ? 'active' : ''}`} 
              onClick={() => setFilter('featured')}
            >
              ⭐ Featured
            </button>
          </div>
        </div>

        <div className="charities-grid">
          {filtered.map(charity => (
            <div 
              key={charity.id} 
              className="charity-card-full" 
              onClick={() => handleCharityClick(charity)}
              id={`charity-${charity.id}`}
            >
              <div className="charity-card-image" style={{
                backgroundImage: `url(${charity.image_url || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800'})`
              }}>
                {charity.featured && <span className="charity-featured-badge">Featured</span>}
              </div>
              <div className="charity-card-body">
                <h3>{charity.name}</h3>
                <p>{charity.description}</p>

                {/* Upcoming Deadlines — ONLY for subscribers */}
                {isSubscribed && charity.events && charity.events.length > 0 && (
                  <div style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: '#e11d48', fontWeight: 'bold' }}>
                    {charity.events.length} Upcoming {charity.events.length === 1 ? 'Deadline' : 'Deadlines'}
                  </div>
                )}
                
                {/* Charity contribution meter — visible to ALL users who support this charity */}
                {user && user.charity_id === charity.id && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(225, 29, 72, 0.05)', border: '1px solid rgba(225, 29, 72, 0.2)', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.85rem', color: '#e11d48', fontWeight: 'bold' }}>
                      You support this cause! ({user.charity_contribution_pct}%)
                    </p>
                    <div style={{ background: 'rgba(225, 29, 72, 0.1)', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${user.charity_contribution_pct || 10}%`, height: '100%', background: 'linear-gradient(90deg, #e11d48, #f43f5e)', borderRadius: '10px' }}></div>
                    </div>
                  </div>
                )}
                <div className="charity-card-footer">
                  <span className="view-profile-link">Learn More ➝</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="no-results">
            <p>No causes found matching your search. Try different keywords.</p>
          </div>
        )}
      </div>

      {/* Charity Profile Modal */}
      {selectedCharity && (
        <div className="charity-modal-overlay" onClick={() => setSelectedCharity(null)}>
          <div className="charity-modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedCharity(null)}>✕</button>
            
            <div className="modal-hero" style={{
              backgroundImage: `url(${selectedCharity.image_url || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800'})`
            }}></div>

            <div className="modal-body">
              <header className="modal-header">
                <h2 className="modal-section-title">About {selectedCharity.name}</h2>
                <p className="modal-description">{selectedCharity.description}</p>

                {/* Charity contribution meter — visible to ALL users who support this charity */}
                {user && user.charity_id === selectedCharity.id && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(225, 29, 72, 0.04)', border: '1px solid rgba(225, 29, 72, 0.15)', borderRadius: '12px' }}>
                    <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', color: '#e11d48' }}>You actively support this cause</h3>
                    <p style={{ margin: '0 0 0.8rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      You are contributing <strong>{user.charity_contribution_pct}%</strong> of your subscription directly to {selectedCharity.name}.
                    </p>
                    <div style={{ background: 'rgba(225, 29, 72, 0.1)', borderRadius: '10px', height: '12px', overflow: 'hidden' }}>
                      <div style={{ width: `${user.charity_contribution_pct || 10}%`, height: '100%', background: 'linear-gradient(90deg, #e11d48, #f43f5e)', borderRadius: '10px' }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', fontSize: '0.75rem', color: '#e11d48', fontWeight: 'bold', opacity: 0.8 }}>
                      <span>10% Base</span>
                      <span>Contribution Scale</span>
                      <span>100% Max</span>
                    </div>
                  </div>
                )}
              </header>

              {/* Upcoming Deadlines — ONLY for subscribers */}
              {isSubscribed && selectedCharity.events && selectedCharity.events.length > 0 && (
                <div className="deadlines-block">
                  <h3 className="modal-section-title">Upcoming Goals & Deadlines</h3>
                  <div className="deadlines-content">
                    {selectedCharity.events.slice().sort((a,b) => new Date(a.date) - new Date(b.date)).map((ev, idx) => (
                      <div className="deadline-item" key={idx}>
                        <div className="deadline-info">
                          <span className="deadline-name">{ev.name || 'Upcoming Goal'}</span>
                        </div>
                        <span className="deadline-date">{ev.date ? new Date(ev.date).toLocaleDateString() : 'TBD'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Non-subscriber: show deadlines are hidden */}
              {!isSubscribed && selectedCharity.events && selectedCharity.events.length > 0 && (
                <div className="sub-gate-inline" style={{ marginBottom: '2rem' }}>
                  <div className="sub-gate-inline-icon">📅</div>
                  <p className="sub-gate-inline-text">
                    This charity has <strong>{selectedCharity.events.length}</strong> upcoming {selectedCharity.events.length === 1 ? 'deadline' : 'deadlines'}. Subscribe to view detailed goals and deadlines.
                  </p>
                  <Link to="/subscription" className="sub-gate-inline-cta">Subscribe to View</Link>
                </div>
              )}

              <div className="total-donations-block">
                <h3 className="modal-section-title">Impact So Far</h3>
                <div className="total-donations-content">
                  <div className="total-donations-amount">
                    {totalDonationsLoading ? 'Calculating...' : (totalDonations ? `₹${totalDonations.total?.toLocaleString('en-IN') || 0}` : '₹0')}
                  </div>
                  {totalDonations && !totalDonationsLoading && (
                    <div className="impact-breakdown">
                      <div className="impact-stat">
                        <span className="impact-label">Direct Donations</span>
                        <span className="impact-value">₹{totalDonations.breakdown?.direct?.toLocaleString('en-IN') || 0}</span>
                      </div>
                      <div className="impact-stat">
                        <span className="impact-label">Subscriptions</span>
                        <span className="impact-value">₹{totalDonations.breakdown?.subscriptions?.toLocaleString('en-IN') || 0}</span>
                      </div>
                    </div>
                  )}
                  <p className="total-donations-text">Total raised through direct donations, subscriptions, and platform events.</p>
                </div>
              </div>

              <div className="donation-box">
                {/* Set as Primary Charity — ONLY for subscribers */}
                {user && user.charity_id !== selectedCharity.id && (
                  <div style={{ paddingBottom: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                    {isSubscribed ? (
                      <>
                        <h4 style={{ marginBottom: '0.4rem' }}>Set as Your Primary Cause</h4>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          Direct your subscription contribution to {selectedCharity.name}.
                        </p>
                        <button 
                          className="btn-primary" 
                          style={{ width: '100%', background: '#10b981', borderColor: '#10b981' }}
                          onClick={async () => {
                            try {
                               const res = await authService.updateProfile({ charity_id: selectedCharity.id });
                               if (res.data) updateUser(res.data);
                               alert(`Success! ${selectedCharity.name} is now your primary supported charity.`);
                            } catch (err) {
                               alert('Failed to update supported cause.');
                            }
                          }}
                        >
                          Set as My Supported Charity
                        </button>
                      </>
                    ) : (
                      /* Non-subscriber: gate charity switching */
                      <div className="sub-gate-inline">
                        <div className="sub-gate-inline-icon">🔄</div>
                        <p className="sub-gate-inline-text">
                          Want to support {selectedCharity.name} as your primary charity? Subscribe to choose and switch charities.
                        </p>
                        <Link to="/subscription" className="sub-gate-inline-cta">Subscribe to Switch</Link>
                      </div>
                    )}
                  </div>
                )}

                <h4>Make an Independent Donation</h4>
                <p>Support this cause directly with a one-time contribution via Razorpay.</p>
                <div className="donation-input-group">
                  <input 
                    type="number" 
                    className="donation-input" 
                    value={donationAmount}
                    onChange={e => setDonationAmount(e.target.value)}
                    min="1"
                  />
                  <button 
                    className="btn-donate-now" 
                    onClick={handleDonate}
                    disabled={isDonating}
                  >
                    {isDonating ? 'Processing...' : 'Donate Now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Charities;
