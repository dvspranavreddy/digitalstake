import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { scoreService, authService } from '../services/endpoints';
import SubscriptionGate from '../components/SubscriptionGate';
import './Scores.css';

const Scores = () => {
  const { user, updateUser, hasActiveSubscription } = useAuth();
  const [scores, setScores] = useState([]);
  const [form, setForm] = useState({ score: '', played_date: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [configMode, setConfigMode] = useState(null);
  const [customNumbers, setCustomNumbers] = useState(['', '', '', '', '']);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ score: '', played_date: '' });
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (user && user.draw_numbers && user.draw_numbers.length === 5) {
      setCustomNumbers(user.draw_numbers.map(String));
    }
  }, [user]);

  const fetchScores = async () => {
    try {
      const { data } = await scoreService.getScores();
      setScores(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchScores(); }, []);

  // ─── Subscription Gate ───
  if (!hasActiveSubscription) {
    return (
      <SubscriptionGate
        title="Score Management"
        message="You need an active subscription to track your Stableford golf scores and enter prize draws. Subscribe now to unlock this feature!"
      />
    );
  }

  const handleSetAutoMode = () => {
    const fallback = new Set();
    while (fallback.size < 5) fallback.add(Math.floor(Math.random() * 45) + 1);
    setCustomNumbers(Array.from(fallback).sort((a,b)=>a-b).map(String));
    setConfigMode('auto');
  };

  const handleAutoFillEmpty = () => {
    const newNums = [...customNumbers];
    const taken = new Set(newNums.filter(n => n !== '').map(Number));
    for (let i = 0; i < 5; i++) {
       if (newNums[i] === '') {
          let rand;
          do { rand = Math.floor(Math.random() * 45) + 1; } while (taken.has(rand));
          taken.add(rand);
          newNums[i] = String(rand);
       }
    }
    setCustomNumbers(newNums);
  };

  const handleLockCustom = async () => {
    setIsSavingEntry(true);
    setError('');
    setSuccess('');
    try {
      const parsed = customNumbers.map(n => parseInt(n, 10)).filter(n => !isNaN(n));
      if (parsed.length !== 5) throw new Error('Please fill all 5 numbers');
      const unique = new Set(parsed);
      if (unique.size !== 5) throw new Error('Numbers must be unique');
      for (const num of parsed) {
         if (num < 1 || num > 45) throw new Error('Numbers must be strictly between 1 and 45');
      }
      
      const res = await authService.updateProfile({ draw_numbers: parsed.sort((a,b)=>a-b) });
      if (res.data) updateUser(res.data);
      setSuccess('Entry securely locked!');
      setConfigMode(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save entry');
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const scoreNum = parseInt(form.score);
    if (scoreNum < 1 || scoreNum > 45) {
      setError('Score must be between 1 and 45');
      return;
    }

    setLoading(true);
    try {
      await scoreService.addScore({ score: scoreNum, played_date: form.played_date });
      setSuccess(scores.length >= 5 ? 'Score added! Oldest score was replaced.' : 'Score added successfully!');
      setForm({ score: '', played_date: '' });
      fetchScores();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add score');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this score?')) return;
    try {
      await scoreService.deleteScore(id);
      fetchScores();
    } catch (err) {
      setError('Failed to delete score');
    }
  };

  const handleEditStart = (s) => {
    setEditingId(s.id);
    setEditForm({
      score: String(s.score),
      played_date: s.played_date ? s.played_date.split('T')[0] : ''
    });
    setError('');
    setSuccess('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditForm({ score: '', played_date: '' });
  };

  const handleEditSave = async (id) => {
    setEditLoading(true);
    setError('');
    setSuccess('');
    try {
      const scoreNum = parseInt(editForm.score);
      if (scoreNum < 1 || scoreNum > 45) {
        setError('Score must be between 1 and 45');
        setEditLoading(false);
        return;
      }
      await scoreService.updateScore(id, { score: scoreNum, played_date: editForm.played_date });
      setSuccess('Score updated successfully!');
      setEditingId(null);
      setEditForm({ score: '', played_date: '' });
      fetchScores();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update score');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="scores-page" id="scores-page">
      <div className="scores-container">
        <h1>Score Management</h1>
        <p className="scores-subtitle">Enter your Stableford golf scores (1–45). Only the latest 5 are kept.</p>

        {/* Score Entry Form */}
        <div className="score-form-card">
          <h2>Add New Score</h2>
          {error && <div className="score-error">{error}</div>}
          {success && <div className="score-success">{success}</div>}
          <form onSubmit={handleAdd} className="score-form">
            <div className="form-group">
              <label htmlFor="score-input">Score (1–45)</label>
              <input
                id="score-input"
                type="number"
                min="1"
                max="45"
                value={form.score}
                onChange={e => setForm({ ...form, score: e.target.value })}
                placeholder="Enter your Stableford score"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="date-input">Date Played</label>
              <input
                id="date-input"
                type="date"
                value={form.played_date}
                onChange={e => setForm({ ...form, played_date: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} id="add-score-btn">
              {loading ? 'Adding...' : 'Add Score'}
            </button>
          </form>
        </div>

        {/* Score Display */}
        <div className="score-display-card">
          <h2>Your Scores ({scores.length}/5)</h2>
          <div className="score-capacity-bar">
            <div className="score-capacity-fill" style={{ width: `${(scores.length / 5) * 100}%` }}></div>
          </div>
          {scores.length > 0 ? (
            <div className="score-entries">
              {scores.map((s, i) => (
                <div key={s.id} className={`score-entry ${editingId === s.id ? 'score-entry-editing' : ''}`}>
                  {editingId === s.id ? (
                    /* ─── Edit Mode ─── */
                    <div className="score-edit-row">
                      <span className="score-rank">#{i + 1}</span>
                      <div className="score-edit-fields">
                        <input
                          type="number"
                          min="1"
                          max="45"
                          value={editForm.score}
                          onChange={e => setEditForm({ ...editForm, score: e.target.value })}
                          className="score-edit-input"
                          placeholder="Score"
                        />
                        <input
                          type="date"
                          value={editForm.played_date}
                          onChange={e => setEditForm({ ...editForm, played_date: e.target.value })}
                          max={new Date().toISOString().split('T')[0]}
                          className="score-edit-input"
                        />
                      </div>
                      <div className="score-edit-actions">
                        <button
                          className="score-edit-save"
                          onClick={() => handleEditSave(s.id)}
                          disabled={editLoading}
                          title="Save"
                        >
                          {editLoading ? '...' : '✓'}
                        </button>
                        <button
                          className="score-edit-cancel"
                          onClick={handleEditCancel}
                          disabled={editLoading}
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ─── Display Mode ─── */
                    <>
                      <div className="score-entry-left">
                        <span className="score-rank">#{i + 1}</span>
                        <div className="score-number-circle">{s.score}</div>
                        <span className="score-entry-date">{new Date(s.played_date).toLocaleDateString()}</span>
                      </div>
                      <div className="score-entry-actions">
                        <button className="score-edit-btn" onClick={() => handleEditStart(s)} title="Edit score">✎</button>
                        <button className="score-delete" onClick={() => handleDelete(s.id)} title="Delete score">✕</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="no-scores">No scores entered yet. Add your first score above!</p>
          )}
          {scores.length >= 5 && (
            <p className="score-note">Adding a new score will automatically replace the oldest one.</p>
          )}
        </div>

        {/* Draw Configurator */}
        {scores.length === 5 && (
          <div className="draw-numbers-card" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '2px solid rgba(16, 185, 129, 0.2)' }}>
            <h2>Your Entry is Ready!</h2>
            
            {user?.draw_numbers && user.draw_numbers.length === 5 && configMode === null ? (
              <div>
                <p style={{ color: '#059669', fontWeight: 'bold', marginBottom: '1rem' }}>Your numbers are securely locked in for the next draw!</p>
                <div className="draw-numbers">
                  {user.draw_numbers.map((num, i) => (
                    <div key={i} className="draw-number-ball" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>{num}</div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p>You've played 5 games! How would you like to build your lottery ticket?</p>
                
                {configMode !== 'auto' && configMode !== 'custom' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
                      <button className="btn-secondary" onClick={handleSetAutoMode} disabled={isSavingEntry} style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.05rem' }}>
                        Automatic Pick
                      </button>
                      <button className="btn-secondary" onClick={() => { setCustomNumbers(['','','','','']); setConfigMode('custom'); }} disabled={isSavingEntry} style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.05rem' }}>
                        Pick By Yourself
                      </button>
                    </div>
                    {user?.draw_numbers && user.draw_numbers.length === 5 && (
                      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <button className="btn-secondary" onClick={() => setConfigMode(null)} style={{ background: 'transparent', border: 'none', color: '#059669', textDecoration: 'underline' }}>
                          Back to Saved Entry
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {(configMode === 'custom' || configMode === 'auto') && (
                  <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'white', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#e11d48' }}>{configMode === 'auto' ? 'Your Auto-Picked Draft' : 'Pick 5 Lucky Numbers (1-45)'}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                      {[0, 1, 2, 3, 4].map(idx => (
                        <input
                          key={idx}
                          type="number"
                          min="1"
                          max="45"
                          disabled={configMode === 'auto'}
                          style={{ width: '100%', textAlign: 'center', fontSize: '1.5rem', fontWeight: '800', padding: '1rem 0', borderRadius: '0.75rem', border: '2px solid rgba(0,0,0,0.1)', color: '#e11d48', outline: 'none', background: configMode === 'auto' ? 'rgba(0,0,0,0.02)' : 'white' }}
                          value={customNumbers[idx] || ''}
                          onChange={(e) => {
                            const newNums = [...customNumbers];
                            newNums[idx] = e.target.value;
                            setCustomNumbers(newNums);
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      {configMode === 'auto' ? (
                        <button type="button" className="btn-secondary" onClick={() => { setCustomNumbers(['','','','','']); setConfigMode('custom'); }} disabled={isSavingEntry}>
                          Actually, let me pick
                        </button>
                      ) : (
                        <button type="button" onClick={handleAutoFillEmpty} style={{ padding: '0.6rem 1.2rem', background: '#f3f4f6', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                          Auto-Fill Remaining
                        </button>
                      )}
                      
                      <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
                        <button type="button" className="btn-secondary" onClick={() => {
                          setConfigMode('select');
                        }} disabled={isSavingEntry} style={{ padding: '0.6rem 1.2rem' }}>
                          Cancel
                        </button>
                        <button type="button" className="btn-primary" onClick={handleLockCustom} disabled={isSavingEntry} style={{ padding: '0.6rem 1.2rem' }}>
                          {isSavingEntry ? 'Saving...' : 'Lock In Entry'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Scores;
