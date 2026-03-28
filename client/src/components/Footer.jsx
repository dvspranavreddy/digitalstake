import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer" id="main-footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <h3><span className="footer-logo-icon">◆</span> DigitalStake</h3>
            <p>Play golf. Win prizes. Change lives.</p>
          </div>
          <div className="footer-links">
            <h4>Platform</h4>
            <a href="/">Home</a>
            <a href="/mechanics">Mechanics</a>
            <a href="/charities">Charities</a>
            <a href="/register">Sign Up</a>
          </div>
          <div className="footer-links">
            <h4>Support</h4>
            <a href="#">FAQ</a>
            <a href="#">Contact</a>
            <a href="#">Privacy</a>
          </div>
          <div className="footer-links">
            <h4>Connect</h4>
            <a href="#">Twitter</a>
            <a href="#">Instagram</a>
            <a href="#">LinkedIn</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} DigitalStake. All rights reserved.</p>
          <p className="footer-tagline">Every score makes an impact</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
