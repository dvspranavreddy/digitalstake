import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService, charityService } from '../services/endpoints';
import './Profile.css';
import './Auth.css';

const Profile = () => {
  const { user, updateUser, logout, hasActiveSubscription } = useAuth();
  const navigate = useNavigate();
  const [charities, setCharities] = useState([]);
  const [form, setForm] = useState({
    full_name: '',
    nickname: '',
    charity_id: '',
    charity_contribution_pct: 10,
    draw_numbers: ['', '', '', '', '']
  });
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    // Fetch charities for the dropdown
    charityService.getAll()
      .then(res => setCharities(res.data))
      .catch(console.error);

    if (user) {
      setForm({
        full_name: user.full_name || '',
        nickname: user.nickname || '',
        charity_id: user.charity_id || '',
        charity_contribution_pct: user.charity_contribution_pct || 10,
        draw_numbers: user.draw_numbers && user.draw_numbers.length === 5 ? user.draw_numbers : ['', '', '', '', ''],
      });
    }
  }, [user]);

  const handleAutoPick = () => {
    const fallback = new Set();
    while (fallback.size < 5) fallback.add(Math.floor(Math.random() * 45) + 1);
    setForm({ ...form, draw_numbers: Array.from(fallback).sort((a,b)=>a-b).map(String) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const updateData = {
        full_name: form.full_name,
        nickname: form.nickname,
        charity_id: form.charity_id || null,
        charity_contribution_pct: parseInt(form.charity_contribution_pct, 10),
      };

      const res = await authService.updateProfile(updateData);
      
      // Instantly refresh the global app context without waiting for a reload!
      if (res.data) updateUser(res.data);
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you absolutely sure you want to delete your account?\n\n' +
      'This will permanently remove:\n' +
      '• Your profile and login\n' +
      '• All your scores\n' +
      '• All your subscriptions\n' +
      '• All your winnings data\n\n' +
      'This action CANNOT be undone.'
    );
    if (!confirmed) return;

    // Double confirm
    const doubleConfirm = window.confirm(
      'FINAL CONFIRMATION: Type OK to permanently delete your account. This is irreversible.'
    );
    if (!doubleConfirm) return;

    setDeleteLoading(true);
    try {
      await authService.deleteAccount();
      logout();
      navigate('/');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete account' });
      setDeleteLoading(false);
    }
  };

  return (
    <div className="profile-page" id="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1>Profile & Settings</h1>
          <p>Manage your account, preferences, and chosen charity.</p>
        </div>

        <div className="profile-card">
          {message.text && (
            <div className={`profile-message ${message.type === 'error' ? 'msg-error' : 'msg-success'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="profile-form">
            
            {/* Added read-only foundational account info */}
            <div className="form-row">
              <div className="form-group-half">
                <label htmlFor="email">Registered Email</label>
                <input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  placeholder="Your Email"
                />
              </div>
              <div className="form-group-half">
                <label htmlFor="member_date">Member Since</label>
                <input
                  id="member_date"
                  type="text"
                  value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  disabled
                  placeholder="Join Date"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="full_name">Full Name</label>
              <input
                id="full_name"
                type="text"
                value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="nickname">Dashboard Nickname (Optional)</label>
              <input
                id="nickname"
                type="text"
                value={form.nickname}
                onChange={e => setForm({ ...form, nickname: e.target.value })}
                placeholder="e.g. Captain Golf"
              />
              <small className="form-help">This shorter name will be used to welcome you on your dashboard.</small>
            </div>

            {hasActiveSubscription ? (
              <>
                <div className="form-group">
                  <label htmlFor="charity_id">Selected Charity</label>
                  <select
                    id="charity_id"
                    value={form.charity_id}
                    onChange={e => setForm({ ...form, charity_id: e.target.value })}
                  >
                    <option value="">-- No Charity Selected --</option>
                    {charities.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <small className="form-help">Select the primary cause your subscription will support.</small>
                </div>

                <div className="form-group">
                  <label htmlFor="charity_contribution_pct">Charity Contribution (%)</label>
                  <div className="pct-slider-container">
                    <input
                      id="charity_contribution_pct"
                      type="range"
                      min="10"
                      max="100"
                      value={form.charity_contribution_pct}
                      onChange={e => setForm({ ...form, charity_contribution_pct: e.target.value })}
                      className="pct-slider"
                    />
                    <span className="pct-display">{form.charity_contribution_pct}%</span>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: '1.5rem', background: 'rgba(255, 126, 179, 0.04)', border: '1px dashed rgba(225, 29, 72, 0.25)', borderRadius: '16px', textAlign: 'center', margin: '0.5rem 0' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔒</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                  Charity selection and contribution settings require an active subscription.
                </p>
                <Link to="/subscription" style={{ display: 'inline-block', padding: '0.65rem 1.8rem', background: 'linear-gradient(135deg, #e11d48, #f43f5e)', color: 'white', fontSize: '0.9rem', fontWeight: '700', borderRadius: '10px', textDecoration: 'none', boxShadow: '0 4px 15px rgba(225, 29, 72, 0.2)', transition: 'all 0.3s ease' }}>
                  Subscribe to Unlock
                </Link>
              </div>
            )}
            <div className="profile-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>

          {/* ─── Danger Zone: Delete Account ─── */}
          <div className="danger-zone">
            <h3>⚠️ Danger Zone</h3>
            <p>
              Permanently delete your account and all associated data. This action cannot be undone — 
              your scores, subscriptions, and winnings will be permanently removed.
            </p>
            <button 
              className="btn-danger" 
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : '🗑️ Delete My Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
