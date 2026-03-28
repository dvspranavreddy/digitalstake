import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, isAdmin, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-container">
        <Link to={isAdmin ? '/admin' : '/'} className="navbar-logo" id="navbar-logo">
          <span className="logo-icon">◆</span>
          <span className="logo-text">DigitalStake</span>
        </Link>

        <button
          className={`navbar-toggle ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          id="navbar-toggle"
          aria-label="Toggle menu"
        >
          <span></span><span></span><span></span>
        </button>

        <div className={`navbar-menu ${menuOpen ? 'open' : ''}`}>
          {isAuthenticated ? (
            <>
              {isAdmin ? (
                /* ── ADMIN NAV ── only admin-relevant links */
                <>
                  <Link to="/admin"          className="nav-link nav-admin" onClick={() => setMenuOpen(false)}>Admin Dashboard</Link>
                  <div className="nav-user-section">
                    <span className="nav-user-name nav-admin-badge">{user?.full_name}</span>
                    <button className="nav-btn-logout" onClick={handleLogout} id="logout-btn">Logout</button>
                  </div>
                </>
              ) : (
                /* ── USER NAV ── regular subscriber links */
                <>
                  <Link to="/"           className="nav-link" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                  <Link to="/scores"     className="nav-link" onClick={() => setMenuOpen(false)}>Scores</Link>
                  <Link to="/charities"  className="nav-link" onClick={() => setMenuOpen(false)}>Charities</Link>
                  <Link to="/winnings"   className="nav-link" onClick={() => setMenuOpen(false)}>Winnings</Link>
                  <Link to="/mechanics"  className="nav-link" onClick={() => setMenuOpen(false)}>Mechanics</Link>
                  <Link to="/profile"    className="nav-link" onClick={() => setMenuOpen(false)}>Profile</Link>
                  <div className="nav-user-section">
                    <span className="nav-user-name">{user?.full_name}</span>
                    <button className="nav-btn-logout" onClick={handleLogout} id="logout-btn">Logout</button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {/* Guest order: Home → Charities → Mechanics → Pricing */}
              <Link to="/"            className="nav-link" onClick={() => setMenuOpen(false)}>Home</Link>
              <Link to="/charities"   className="nav-link" onClick={() => setMenuOpen(false)}>Charities</Link>
              <Link to="/mechanics"   className="nav-link" onClick={() => setMenuOpen(false)}>Mechanics</Link>
              <Link to="/subscription" className="nav-link" onClick={() => setMenuOpen(false)}>Pricing</Link>

              <div className="nav-auth-buttons">
                <Link to="/login"    className="nav-btn-login"  onClick={() => setMenuOpen(false)} id="login-btn">Log In</Link>
                <Link to="/register" className="nav-btn-signup" onClick={() => setMenuOpen(false)} id="register-btn">Get Started</Link>
              </div>
            </>
          )}
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
