import { useState, useEffect } from 'react';
import { winnerService } from '../services/endpoints';
import { useAuth } from '../context/AuthContext';
import SubscriptionGate from '../components/SubscriptionGate';
import './Winnings.css';

const Winnings = () => {
  const { hasActiveSubscription } = useAuth();
  const [winnings, setWinnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState(null);

  useEffect(() => {
    if (hasActiveSubscription) fetchWinnings();
    else setLoading(false);
  }, [hasActiveSubscription]);

  const fetchWinnings = async () => {
    try {
      const { data } = await winnerService.getMyWinnings();
      setWinnings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProofUpload = async (winnerId, file) => {
    if (!file) return;
    setUploadingId(winnerId);
    try {
      const formData = new FormData();
      formData.append('proof', file);
      await winnerService.uploadProof(winnerId, formData);
      fetchWinnings();
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || 'Unknown error'));
    } finally {
      setUploadingId(null);
    }
  };

  const totalWon = winnings.reduce((sum, w) => sum + (w.prize_amount || 0), 0);
  const totalPaid = winnings.filter(w => w.payment_status === 'paid').reduce((sum, w) => sum + (w.prize_amount || 0), 0);
  const pendingCount = winnings.filter(w => w.verification_status === 'pending').length;

  if (!hasActiveSubscription) {
    return (
      <SubscriptionGate
        title="Winnings Dashboard"
        message="You need an active subscription to view your winnings and prize history. Subscribe now to track your prizes!"
      />
    );
  }

  if (loading) {
    return (
      <div className="winnings-page">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="winnings-page" id="winnings-page">
      <div className="winnings-container">
        <h1>Your Winnings</h1>
        <p className="winnings-subtitle">Track your prizes and upload verification proof</p>

        <div className="winnings-summary">
          <div className="win-summary-card">
            <span className="win-summary-label">Total Won</span>
            <span className="win-summary-value">₹{(totalWon / 100).toLocaleString('en-IN')}</span>
          </div>
          <div className="win-summary-card">
            <span className="win-summary-label">Paid Out</span>
            <span className="win-summary-value win-paid">₹{(totalPaid / 100).toLocaleString('en-IN')}</span>
          </div>
          <div className="win-summary-card">
            <span className="win-summary-label">Pending Verification</span>
            <span className="win-summary-value win-pending">{pendingCount}</span>
          </div>
        </div>

        {winnings.length > 0 ? (
          <div className="winnings-table-wrap">
            <table className="winnings-table">
              <thead>
                <tr>
                  <th>Draw Date</th>
                  <th>Match</th>
                  <th>Prize</th>
                  <th>Verification</th>
                  <th>Payment</th>
                  <th>Proof</th>
                </tr>
              </thead>
              <tbody>
                {winnings.map(w => (
                  <tr key={w.id}>
                    <td>{w.draws ? new Date(w.draws.draw_date).toLocaleDateString() : '—'}</td>
                    <td><span className={`match-badge mb-${w.match_type.replace('-', '')}`}>{w.match_type}</span></td>
                    <td className="prize-col">₹{(w.prize_amount / 100).toLocaleString('en-IN')}</td>
                    <td><span className={`v-status vs-${w.verification_status}`}>{w.verification_status}</span></td>
                    <td><span className={`p-status ps-${w.payment_status}`}>{w.payment_status}</span></td>
                    <td>
                      {w.proof_url ? (
                        <span className="proof-uploaded">✓ Uploaded</span>
                      ) : (
                        <label className="proof-upload-btn">
                          {uploadingId === w.id ? 'Uploading...' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={e => handleProofUpload(w.id, e.target.files[0])}
                            disabled={uploadingId === w.id}
                          />
                        </label>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-winnings">
            <h3>No Winnings Yet</h3>
            <p>Keep entering your scores and participating in draws. Your winning moment is coming!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Winnings;
