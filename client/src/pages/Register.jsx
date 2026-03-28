import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { charityService } from '../services/endpoints';
import './Auth.css';

const Register = () => {
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    charity_id: '',
    charity_contribution_pct: 10,
  });
  const [charities, setCharities] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    charityService.getAll()
      .then(res => setCharities(res.data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.charity_contribution_pct < 10) {
      setError('Charity contribution must be at least 10%');
      return;
    }
    setLoading(true);
    try {
      await register({
        ...form,
        charity_contribution_pct: parseInt(form.charity_contribution_pct),
      });
      navigate('/subscription');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details?.join(', ') || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" id="register-page">
      <div className="auth-container">
        <div className="auth-card auth-card-wide">
          <div className="auth-header">
            <h1>Join DigitalStake</h1>
            <p>Create your account and start making an impact</p>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="full_name">Full Name</label>
                <input
                  id="full_name"
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="reg-email">Email</label>
                <input
                  id="reg-email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="charity">Select a Charity to Support</label>
              <select
                id="charity"
                value={form.charity_id}
                onChange={e => setForm({ ...form, charity_id: e.target.value })}
              >
                <option value="">-- Select a charity (optional) --</option>
                {charities.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="contribution">Charity Contribution ({form.charity_contribution_pct}%)</label>
              <input
                id="contribution"
                type="range"
                min="10"
                max="50"
                value={form.charity_contribution_pct}
                onChange={e => setForm({ ...form, charity_contribution_pct: parseInt(e.target.value) })}
                className="range-input"
              />
              <div className="range-labels">
                <span>10% (min)</span>
                <span>50%</span>
              </div>
            </div>
            <button type="submit" className="btn-primary auth-submit" disabled={loading} id="register-submit">
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
