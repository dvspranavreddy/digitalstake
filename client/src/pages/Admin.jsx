import { useState, useEffect } from 'react';
import { adminService, drawService, winnerService, charityService, campaignAdminService } from '../services/endpoints';
import './Admin.css';

// ─── Modal MUST be outside Admin to prevent re-mount on state changes ───
const Modal = ({ title, onClose, children }) => (
  <div className="admin-modal-overlay" onClick={onClose}>
    <div className="admin-modal" onClick={e => e.stopPropagation()}>
      <div className="admin-modal-header">
        <h3>{title}</h3>
        <button className="admin-modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="admin-modal-body">{children}</div>
    </div>
  </div>
);

const Admin = () => {
  const [tab, setTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [draws, setDraws] = useState([]);
  const [winners, setWinners] = useState([]);
  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [subSearch, setSubSearch] = useState('');
  const [subFilter, setSubFilter] = useState('all');

  // Charity form
  const [charityForm, setCharityForm] = useState({ name: '', description: '', image_url: '', featured: false, events: [] });
  const [editingCharity, setEditingCharity] = useState(null);

  // Campaigns
  const [campaigns, setCampaigns] = useState([]);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ name: '', code: '', type: 'discount', discount_pct: 10, target_charity_id: '' });

  // Draws
  const [drawLogic, setDrawLogic] = useState('random');
  const [selectedDrawAnalysis, setSelectedDrawAnalysis] = useState(null);
  const [pendingJackpot, setPendingJackpot] = useState(0);

  // ─── User Management Modals ───
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(null);
  const [createUserForm, setCreateUserForm] = useState({ full_name: '', email: '', password: '', role: 'user', nickname: '', charity_id: '', charity_contribution_pct: 10 });
  const [editUserForm, setEditUserForm] = useState({ full_name: '', email: '', nickname: '', charity_id: '', charity_contribution_pct: 10 });
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchData();
  }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (tab) {
        case 'analytics':
          setAnalytics((await adminService.getAnalytics()).data);
          break;
        case 'users': {
          const [uRes, cResForUsers] = await Promise.all([adminService.getUsers(), charityService.getAll()]);
          setUsers(uRes.data);
          setCharities(cResForUsers.data);
          break;
        }
        case 'subscriptions':
          setSubscriptions((await adminService.getSubscriptions()).data);
          break;
        case 'draws': {
          const { data } = await drawService.getAll();
          setDraws(data);
          // Calculate pending jackpot from last published draw
          const published = data.filter(d => d.status === 'published');
          if (published.length > 0) {
            const last = published[0]; // Already sorted desc
            const { data: winners } = await winnerService.getAll();
            const has5Match = winners.some(w => w.draw_id === last.id && w.match_type === '5-match');
            setPendingJackpot(has5Match ? 0 : last.jackpot_amount);
          }
          break;
        }
        case 'winners':
          setWinners((await winnerService.getAll()).data);
          break;
        case 'charities':
          setCharities((await charityService.getAll()).data);
          break;
        case 'campaigns': {
          const [campRes, charRes] = await Promise.all([campaignAdminService.getAll(), charityService.getAll()]);
          setCampaigns(campRes.data);
          setCharities(charRes.data);
          break;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  // ─── USER CRUD ───
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setActionLoading('create-user');
    try {
      await adminService.createUser(createUserForm);
      showMsg('User created successfully!');
      setShowCreateUser(false);
      setCreateUserForm({ full_name: '', email: '', password: '', role: 'user', nickname: '', charity_id: '', charity_contribution_pct: 10 });
      fetchData();
    } catch (err) {
      const d = err.response?.data;
      const msg = d?.details?.length ? d.details.join(', ') : (d?.error || 'Failed');
      showMsg('Error: ' + msg);
    } finally {
      setActionLoading('');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setActionLoading('edit-user');
    try {
      await adminService.updateUser(showEditUser.id, editUserForm);
      showMsg('User updated successfully!');
      setShowEditUser(null);
      fetchData();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.error || 'Failed'));
    } finally {
      setActionLoading('');
    }
  };

  const openEditUser = (u) => {
    setEditUserForm({
      full_name: u.full_name || '',
      email: u.email || '',
      nickname: u.nickname || '',
      charity_id: u.charity_id || '',
      charity_contribution_pct: u.charity_contribution_pct || 10,
    });
    setShowEditUser(u);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setActionLoading('change-pw');
    try {
      await adminService.changeUserPassword(showPasswordModal, newPassword);
      showMsg('Password updated!');
      setShowPasswordModal(null);
      setNewPassword('');
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.error || 'Failed'));
    } finally {
      setActionLoading('');
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Change role to "${newRole}"?`)) return;
    setActionLoading(userId + '-role');
    try {
      await adminService.updateUser(userId, { role: newRole });
      showMsg(`Role updated to ${newRole}`);
      fetchData();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.error || 'Failed'));
    } finally {
      setActionLoading('');
    }
  };

  const handleSuspendUser = async (userId) => {
    if (!confirm('Suspend this user? They will not be able to log in.')) return;
    setActionLoading(userId + '-suspend');
    try {
      await adminService.suspendUser(userId);
      showMsg('User suspended');
      fetchData();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.error || 'Failed'));
    } finally {
      setActionLoading('');
    }
  };

  const handleUnsuspendUser = async (userId) => {
    if (!confirm('Unsuspend this user? They will be able to log in again.')) return;
    setActionLoading(userId + '-suspend');
    try {
      await adminService.unsuspendUser(userId);
      showMsg('User unsuspended');
      fetchData();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.error || 'Failed'));
    } finally {
      setActionLoading('');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`PERMANENTLY delete "${userName}"? This cannot be undone. All their data (scores, subscriptions, winnings) will be removed.`)) return;
    setActionLoading(userId + '-delete');
    try {
      await adminService.deleteUser(userId);
      showMsg('User deleted permanently');
      fetchData();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.error || 'Failed'));
    } finally {
      setActionLoading('');
    }
  };

  const handleCancelSub = async (subId) => {
    if (!confirm('Cancel this subscription?')) return;
    setActionLoading(subId + '-sub');
    try {
      await adminService.cancelSubscription(subId);
      showMsg('Subscription cancelled.');
      fetchData();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.error || 'Failed'));
    } finally {
      setActionLoading('');
    }
  };

  // ─── DRAW ACTIONS ───
  const handleSimulate = async () => {
    setActionLoading('simulate');
    try {
      const { data } = await drawService.simulate(drawLogic);
      showMsg('Simulation complete');
      fetchData();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.error || 'Simulation failed'));
    } finally {
      setActionLoading('');
    }
  };

  const handlePublish = async (drawId) => {
    if (!confirm('Are you absolutely sure you want to PUBLISH this draw?\n\nThis will:\n1. Finalize winning numbers\n2. Calculate and lock all prize payouts\n3. Permanently close and delete all other simulations for this month.')) return;
    setActionLoading(drawId);
    try {
      const { data } = await drawService.publish(drawId);
      showMsg(`Success! Draw published with ${data.winners} winners.`);
      fetchData();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.error || 'Publish failed'));
    } finally {
      setActionLoading('');
    }
  };

  const handleAnalyzeDraw = async (drawId) => {
    setActionLoading(drawId + '-analyze');
    try {
      const { data } = await drawService.getById(drawId);
      // Backend now provides unified 'analysis' or 'winners'
      setSelectedDrawAnalysis(data);
    } catch (err) {
      showMsg('Failed to load analysis');
    } finally {
      setActionLoading('');
    }
  };

  // ─── WINNER ACTIONS ───
  const handleVerify = async (winnerId, status) => {
    setActionLoading(winnerId);
    try {
      await winnerService.verify(winnerId, status);
      showMsg(`Winner ${status}!`);
      fetchData();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.error || 'Verification failed'));
    } finally {
      setActionLoading('');
    }
  };

  const handleMarkPaid = async (winnerId) => {
    setActionLoading(winnerId);
    try {
      await winnerService.markPaid(winnerId);
      showMsg('Marked as paid!');
      fetchData();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.error || 'Failed'));
    } finally {
      setActionLoading('');
    }
  };

  // ─── CHARITY CRUD ───
  const handleCreateCharity = async (e) => {
    e.preventDefault();
    setActionLoading('create-charity');
    try {
      if (editingCharity) {
        await charityService.update(editingCharity, charityForm);
        showMsg('Charity updated!');
      } else {
        await charityService.create(charityForm);
        showMsg('Charity created!');
      }
      setCharityForm({ name: '', description: '', image_url: '', featured: false, events: [] });
      setEditingCharity(null);
      fetchData();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.error || err.response?.data?.details?.join(', ') || 'Failed'));
    } finally {
      setActionLoading('');
    }
  };

  const handleDeleteCharity = async (id) => {
    if (!confirm('Delete this charity?')) return;
    try {
      await charityService.delete(id);
      showMsg('Charity deleted!');
      fetchData();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.error || 'Delete failed'));
    }
  };

  const startEditCharity = (c) => {
    setEditingCharity(c.id);
      setCharityForm({
        name: c.name,
        description: c.description || '',
        image_url: c.image_url || '',
        featured: c.featured || false,
        events: c.events || []
      });
  };

  // ─── CAMPAIGN CRUD ───
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setActionLoading('create-campaign');
    try {
      await campaignAdminService.create(campaignForm);
      showMsg('Campaign created!');
      setShowCampaignModal(false);
      setCampaignForm({ name: '', code: '', type: 'discount', discount_pct: 10, target_charity_id: '' });
      fetchData();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.error || 'Failed'));
    } finally {
      setActionLoading('');
    }
  };

  const handleToggleCampaign = async (c) => {
    try {
      await campaignAdminService.toggle(c.id, c.active);
      showMsg('Campaign status updated!');
      fetchData();
    } catch (err) {
      showMsg('Error updating campaign');
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!confirm('Permanently delete this campaign?')) return;
    try {
      await campaignAdminService.delete(id);
      showMsg('Campaign deleted!');
      fetchData();
    } catch (err) {
      showMsg('Error: ' + (err.response?.data?.error || 'Failed (ensure no users are bound to it)'));
    }
  };

  return (
    <div className="admin-page" id="admin-page">
      <div className="admin-container">
        <h1>Admin Dashboard</h1>

        {message && <div className="admin-message">{message}</div>}

        {/* Tabs */}
        <div className="admin-tabs">
          {['analytics', 'users', 'subscriptions', 'draws', 'winners', 'charities', 'campaigns'].map(t => (
            <button
              key={t}
              className={`admin-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
              id={`tab-${t}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="dashboard-loading"><div className="loading-spinner"></div></div>
        ) : (
          <>
            {/* ─── Analytics Tab ─── */}
            {tab === 'analytics' && analytics && (
              <div className="analytics-grid">
                <div className="analytics-card"><span className="ac-label">Total Users</span><span className="ac-value">{analytics.totalUsers}</span></div>
                <div className="analytics-card"><span className="ac-label">Active Subs</span><span className="ac-value ac-green">{analytics.activeSubscriptions}</span></div>
                <div className="analytics-card"><span className="ac-label">Total Revenue</span><span className="ac-value">₹{(analytics.totalRevenue / 100).toLocaleString('en-IN')}</span></div>
                <div className="analytics-card"><span className="ac-label">Prize Pool</span><span className="ac-value ac-gold">₹{(analytics.prizePoolTotal / 100).toLocaleString('en-IN')}</span></div>
                <div className="analytics-card"><span className="ac-label">Charity Total</span><span className="ac-value ac-green">₹{(analytics.totalCharityContributions / 100).toLocaleString('en-IN')}</span></div>
                <div className="analytics-card"><span className="ac-label">Total Draws</span><span className="ac-value">{analytics.totalDraws}</span></div>
                <div className="analytics-card"><span className="ac-label">Published Draws</span><span className="ac-value">{analytics.publishedDraws}</span></div>
                <div className="analytics-card"><span className="ac-label">Simulated Draws</span><span className="ac-value" style={{ color: '#8b5cf6' }}>{analytics.simulatedDraws}</span></div>
                <div className="analytics-card"><span className="ac-label">Jackpot Rollover</span><span className="ac-value ac-gold">₹{(analytics.jackpotRollover / 100).toLocaleString('en-IN')}</span></div>
                <div className="analytics-card"><span className="ac-label">Total Winners</span><span className="ac-value">{analytics.totalWinners}</span></div>
                <div className="analytics-card"><span className="ac-label">Paid Out</span><span className="ac-value">₹{(analytics.totalPaidOut / 100).toLocaleString('en-IN')}</span></div>
                <div className="analytics-card"><span className="ac-label">Suspended</span><span className="ac-value" style={{color:'var(--accent-red)'}}>{analytics.suspendedUsers}</span></div>
              </div>
            )}

            {/* ─── Users Tab ─── */}
            {tab === 'users' && (
              <>
                <div className="admin-toolbar">
                  <button className="btn-primary btn-sm" onClick={() => setShowCreateUser(true)} id="add-user-btn">
                    + Add User
                  </button>
                  <input
                    type="text"
                    placeholder="Search by name or email…"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="admin-search-input admin-search-wide"
                  />
                  <div className="filter-toggles">
                    <button className={`filter-btn ${roleFilter === 'all' ? 'filter-active' : ''}`} onClick={() => setRoleFilter('all')}>All</button>
                    <button className={`filter-btn ${roleFilter === 'user' ? 'filter-active' : ''}`} onClick={() => setRoleFilter('user')}>User</button>
                    <button className={`filter-btn ${roleFilter === 'admin' ? 'filter-active' : ''}`} onClick={() => setRoleFilter('admin')}>Admin</button>
                  </div>
                  <span className="toolbar-count">{users.length} total</span>
                </div>
                <div className="admin-cards-list">
                  {users
                    .filter(u => {
                      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
                      if (!userSearch) return true;
                      return u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                             u.email?.toLowerCase().includes(userSearch.toLowerCase());
                    })
                    .map(u => {
                      const activeSub = u.subscriptions?.find(s => s.status === 'active');
                      const isSuspended = u.role === 'suspended';
                      return (
                        <div key={u.id} className={`admin-user-card ${isSuspended ? 'user-card-suspended' : ''}`}>
                          <div className="auc-main">
                            <div className="auc-info">
                              <div className="auc-name">{u.full_name}</div>
                              <div className="auc-email">{u.email}</div>
                            </div>
                            <div className="auc-badges">
                              <span className={`role-badge rb-${u.role}`}>{u.role}</span>
                              <span className={`status-badge ${u.subscription_status === 'active' ? 'sb-active' : (u.subscription_status === 'expired' ? 'sb-expired' : 'sb-none')}`}>
                                {u.subscription_status}
                              </span>
                            </div>
                            <div className="auc-meta">
                              <span>Plan: <strong>{activeSub?.plan_type || '—'}</strong></span>
                              <span>Charity: <strong>{charities.find(c => c.id === u.charity_id)?.name || 'None'}</strong> ({u.charity_contribution_pct}%)</span>
                              <span>Joined: <strong>{new Date(u.created_at).toLocaleDateString()}</strong></span>
                            </div>
                          </div>
                          <div className="auc-actions">
                            <button className="btn-xs btn-edit" onClick={() => openEditUser(u)} title="Edit profile">Edit</button>
                            <button className="btn-xs btn-pay" onClick={() => { setShowPasswordModal(u.id); setNewPassword(''); }} title="Change password">Password</button>
                            {!isSuspended && (
                              <button className="btn-xs btn-edit" onClick={() => handleToggleRole(u.id, u.role)} disabled={actionLoading === u.id + '-role'} title={u.role === 'admin' ? 'Make User' : 'Make Admin'}>
                                {u.role === 'admin' ? 'User' : 'Admin'}
                              </button>
                            )}
                            {isSuspended ? (
                              <button className="btn-xs btn-approve" onClick={() => handleUnsuspendUser(u.id)} disabled={actionLoading === u.id + '-suspend'} title="Unsuspend user">Unsuspend</button>
                            ) : (
                              <button className="btn-xs btn-reject" onClick={() => handleSuspendUser(u.id)} disabled={actionLoading === u.id + '-suspend'} title="Suspend user">Suspend</button>
                            )}
                            <button className="btn-xs btn-delete" onClick={() => handleDeleteUser(u.id, u.full_name)} disabled={actionLoading === u.id + '-delete'} title="Delete user permanently">Delete</button>
                          </div>
                        </div>
                      );
                    })}
                  {users.length === 0 && <p className="admin-empty">No users found.</p>}
                </div>

                {/* ─── Create User Modal ─── */}
                {showCreateUser && (
                  <Modal title="Add New User" onClose={() => setShowCreateUser(false)}>
                    <form onSubmit={handleCreateUser} className="modal-form">
                      <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" value={createUserForm.full_name} onChange={e => setCreateUserForm({...createUserForm, full_name: e.target.value})} required placeholder="John Doe" />
                      </div>
                      <div className="form-group">
                        <label>Nickname (Optional)</label>
                        <input type="text" value={createUserForm.nickname} onChange={e => setCreateUserForm({...createUserForm, nickname: e.target.value})} placeholder="e.g. Captain Golf" />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" value={createUserForm.email} onChange={e => setCreateUserForm({...createUserForm, email: e.target.value})} required placeholder="user@example.com" />
                      </div>
                      <div className="form-group">
                        <label>Password</label>
                        <input type="password" value={createUserForm.password} onChange={e => setCreateUserForm({...createUserForm, password: e.target.value})} required minLength={6} placeholder="Min 6 characters" />
                      </div>
                      <div className="form-group">
                        <label>Charity</label>
                        <select value={createUserForm.charity_id} onChange={e => setCreateUserForm({...createUserForm, charity_id: e.target.value})}>
                          <option value="">-- No Charity --</option>
                          {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Role</label>
                          <select value={createUserForm.role} onChange={e => setCreateUserForm({...createUserForm, role: e.target.value})}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Charity % ({createUserForm.charity_contribution_pct}%)</label>
                          <input type="range" min="10" max="50" value={createUserForm.charity_contribution_pct} onChange={e => setCreateUserForm({...createUserForm, charity_contribution_pct: parseInt(e.target.value)})} />
                        </div>
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="btn-primary btn-sm" disabled={actionLoading === 'create-user'}>
                          {actionLoading === 'create-user' ? 'Creating...' : 'Create User'}
                        </button>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setShowCreateUser(false)}>Cancel</button>
                      </div>
                    </form>
                  </Modal>
                )}

                {/* ─── Edit User Modal ─── */}
                {showEditUser && (
                  <Modal title={`Edit — ${showEditUser.full_name}`} onClose={() => setShowEditUser(null)}>
                    <form onSubmit={handleEditUser} className="modal-form">
                      <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" value={editUserForm.full_name} onChange={e => setEditUserForm({...editUserForm, full_name: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label>Nickname</label>
                        <input type="text" value={editUserForm.nickname} onChange={e => setEditUserForm({...editUserForm, nickname: e.target.value})} placeholder="Optional" />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" value={editUserForm.email} onChange={e => setEditUserForm({...editUserForm, email: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label>Charity</label>
                        <select value={editUserForm.charity_id} onChange={e => setEditUserForm({...editUserForm, charity_id: e.target.value})}>
                          <option value="">-- No Charity --</option>
                          {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Charity Contribution ({editUserForm.charity_contribution_pct}%)</label>
                        <input type="range" min="10" max="50" value={editUserForm.charity_contribution_pct} onChange={e => setEditUserForm({...editUserForm, charity_contribution_pct: parseInt(e.target.value)})} />
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="btn-primary btn-sm" disabled={actionLoading === 'edit-user'}>
                          {actionLoading === 'edit-user' ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setShowEditUser(null)}>Cancel</button>
                      </div>
                    </form>
                  </Modal>
                )}

                {/* ─── Change Password Modal ─── */}
                {showPasswordModal && (
                  <Modal title="Change Password" onClose={() => setShowPasswordModal(null)}>
                    <form onSubmit={handleChangePassword} className="modal-form">
                      <div className="form-group">
                        <label>New Password</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters" />
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="btn-primary btn-sm" disabled={actionLoading === 'change-pw'}>
                          {actionLoading === 'change-pw' ? 'Updating...' : 'Update Password'}
                        </button>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setShowPasswordModal(null)}>Cancel</button>
                      </div>
                    </form>
                  </Modal>
                )}
              </>
            )}

            {/* ─── Subscriptions Tab ─── */}
            {tab === 'subscriptions' && (
              <>
                <div className="admin-toolbar">
                  <input
                    type="text"
                    placeholder="Search by name or email…"
                    value={subSearch}
                    onChange={e => setSubSearch(e.target.value)}
                    className="admin-search-input admin-search-wide"
                  />
                  <div className="filter-toggles">
                    <button className={`filter-btn ${subFilter === 'all' ? 'filter-active' : ''}`} onClick={() => setSubFilter('all')}>All</button>
                    <button className={`filter-btn ${subFilter === 'active' ? 'filter-active' : ''}`} onClick={() => setSubFilter('active')}>Active</button>
                    <button className={`filter-btn ${subFilter === 'cancelled' ? 'filter-active' : ''}`} onClick={() => setSubFilter('cancelled')}>Cancelled</button>
                  </div>
                  <span className="toolbar-count">{subscriptions.length} total</span>
                </div>
                <div className="admin-cards-list">
                  {subscriptions
                    .filter(s => {
                      if (subFilter !== 'all' && s.status !== subFilter) return false;
                      if (!subSearch) return true;
                      return s.users?.full_name?.toLowerCase().includes(subSearch.toLowerCase()) ||
                             s.users?.email?.toLowerCase().includes(subSearch.toLowerCase());
                    })
                    .map(s => (
                    <div key={s.id} className={`admin-sub-card ${s.status === 'cancelled' ? 'sub-card-cancelled' : ''}`}>
                      <div className="asc-main">
                        <div className="asc-info">
                          <div className="asc-name">{s.users?.full_name || '—'}</div>
                          <div className="asc-email">{s.users?.email || '—'}</div>
                        </div>
                        <div className="asc-badges">
                          <span className="asc-plan">{s.plan_type}</span>
                          <span className={`status-badge ${s.status === 'active' ? 'sb-active' : s.status === 'cancelled' ? 'sb-expired' : 'sb-none'}`}>
                            {s.status}
                          </span>
                        </div>
                        <div className="asc-meta">
                          <span>Amount: <strong className="asc-amount">₹{(s.amount / 100).toLocaleString('en-IN')}</strong></span>
                          <span>Started: <strong>{new Date(s.starts_at).toLocaleDateString()}</strong></span>
                          <span>Expires: <strong>{new Date(s.expires_at).toLocaleDateString()}</strong></span>
                        </div>
                      </div>
                      <div className="asc-actions">
                        {s.status === 'active' && (
                          <button
                            className="btn-xs btn-reject"
                            onClick={() => handleCancelSub(s.id)}
                            disabled={actionLoading === s.id + '-sub'}
                          >
                            Cancel Sub
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {subscriptions.length === 0 && <p className="admin-empty">No subscriptions found.</p>}
                </div>
              </>
            )}

            {/* ─── Campaigns Tab ─── */}
            {tab === 'campaigns' && (
              <>
                <div className="admin-toolbar">
                  <button className="btn-primary btn-sm" onClick={() => setShowCampaignModal(true)} id="add-campaign-btn">
                    + Assign Campaign Code
                  </button>
                  <span className="toolbar-count">{campaigns.length} campaigns</span>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Campaign</th>
                        <th>Code</th>
                        <th>Type / Discount</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map(c => (
                        <tr key={c.id}>
                          <td>
                            <strong>{c.name}</strong><br/>
                            <small style={{ color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</small>
                          </td>
                          <td><span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-violet)', background: 'rgba(139,92,246,0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>{c.code}</span></td>
                          <td>
                            <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{c.type}</span> 
                            {c.discount_pct > 0 ? ` (${c.discount_pct}% Off)` : ''}
                            {c.target_charity && <div><small>Targets: {c.target_charity.name}</small></div>}
                          </td>
                          <td>
                            <span className={`status-badge ${c.active ? 'sb-active' : 'sb-expired'}`}>{c.active ? 'Active' : 'Inactive'}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className={`btn-xs ${c.active ? 'btn-reject' : 'btn-approve'}`} onClick={() => handleToggleCampaign(c)}>
                                {c.active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button className="btn-xs btn-delete" onClick={() => handleDeleteCampaign(c.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {campaigns.length === 0 && <p className="admin-empty">No active campaigns.</p>}
                </div>
                
                {showCampaignModal && (
                  <Modal title="Create New Campaign" onClose={() => setShowCampaignModal(false)}>
                    <form onSubmit={handleCreateCampaign} className="modal-form">
                      <div className="form-group">
                        <label>Campaign Title</label>
                        <input type="text" value={campaignForm.name} onChange={e => setCampaignForm({...campaignForm, name: e.target.value})} required placeholder="e.g. Summer Blowout" />
                      </div>
                      <div className="form-group">
                        <label>Promo Code</label>
                        <input type="text" value={campaignForm.code} onChange={e => setCampaignForm({...campaignForm, code: e.target.value})} required placeholder="e.g. SUMMER50" style={{ textTransform: 'uppercase' }} />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Campaign Type</label>
                          <select value={campaignForm.type} onChange={e => setCampaignForm({...campaignForm, type: e.target.value})}>
                            <option value="discount">Direct Discount</option>
                            <option value="corporate">Corporate Track</option>
                            <option value="referral">Referral Code</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Discount Pct (%)</label>
                          <input type="number" min="0" max="100" value={campaignForm.discount_pct} onChange={e => setCampaignForm({...campaignForm, discount_pct: e.target.value})} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Force Specific Charity Option (Optional)</label>
                        <select value={campaignForm.target_charity_id} onChange={e => setCampaignForm({...campaignForm, target_charity_id: e.target.value})}>
                          <option value="">-- None (Allow user choice) --</option>
                          {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="btn-primary btn-sm" disabled={actionLoading === 'create-campaign'}>
                          {actionLoading === 'create-campaign' ? 'Creating...' : 'Launch Campaign'}
                        </button>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setShowCampaignModal(false)}>Cancel</button>
                      </div>
                    </form>
                  </Modal>
                )}
              </>
            )}

            {/* ─── Draws Tab ─── */}
            {tab === 'draws' && (
              <>
                <div className="admin-actions-bar" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(225, 29, 72, 0.03)', border: '1px solid rgba(225, 29, 72, 0.15)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                  <div style={{ flex: '1 1 240px' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      Draw Simulation
                      {pendingJackpot > 0 && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px', border: '1px solid #f59e0b', whiteSpace: 'nowrap' }}>
                        Rollover: ₹{(pendingJackpot / 100).toLocaleString('en-IN')}
                      </span>}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Run a monthly simulation to calculate prizes before publishing results.</p>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="draw-logic-selector">
                      <select value={drawLogic} onChange={(e) => setDrawLogic(e.target.value)}>
                        <option value="random">Random (Standard Lottery)</option>
                        <option value="most_frequent">Most Frequent User Picks</option>
                        <option value="least_frequent">Least Frequent User Picks</option>
                        <option value="guarantee_winner">Guarantee Winner (Testing)</option>
                      </select>
                    </div>
                    <button className="btn-primary" onClick={handleSimulate} disabled={!!actionLoading} id="simulate-draw">
                      {actionLoading === 'simulate' ? 'Simulating...' : 'Simulate New Draw'}
                    </button>
                  </div>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Numbers</th>
                        <th>Status</th>
                        <th>Jackpot</th>
                        <th>Pool</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                       {draws.map(d => (
                        <tr key={d.id}>
                          <td>{new Date(d.draw_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric', day: 'numeric' })}</td>
                          <td>
                            <div className="draw-nums">
                              {d.winning_numbers?.map((n, i) => (
                                <span key={i} className="draw-num">{n}</span>
                              ))}
                            </div>
                          </td>
                          <td><span className={`draw-status ds-${d.status}`}>{d.status}</span></td>
                          <td><strong style={{ color: '#059669' }}>₹{(d.jackpot_amount / 100).toLocaleString('en-IN')}</strong></td>
                          <td>₹{(d.pool_total / 100).toLocaleString('en-IN')}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {d.status === 'simulated' && (
                                <>
                                  <button className="btn-xs btn-edit" style={{ background: '#f3f4f6', color: '#374151' }} onClick={() => handleAnalyzeDraw(d.id)} disabled={actionLoading === d.id + '-analyze'}>
                                    Analyze
                                  </button>
                                  <button className="btn-xs btn-publish" onClick={() => handlePublish(d.id)} disabled={actionLoading === d.id}>
                                    Publish
                                  </button>
                                </>
                              )}
                              {d.status === 'published' && (
                                <button className="btn-xs btn-edit" style={{ background: '#f3f4f6', color: '#374151' }} onClick={() => handleAnalyzeDraw(d.id)}>
                                  Details
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ─── Draw Analysis Modal ─── */}
                {selectedDrawAnalysis && (
                  <Modal 
                    title={selectedDrawAnalysis.status === 'simulated' ? 'Pre-Analysis Report' : 'Draw Results Analysis'} 
                    onClose={() => setSelectedDrawAnalysis(null)}
                  >
                    <div className="analysis-report">
                      {/* Winning Numbers */}
                      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Winning Numbers</span>
                        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                          {selectedDrawAnalysis.winning_numbers?.map((n, i) => (
                            <span key={i} style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--grad-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 3px 12px rgba(233,30,140,0.3)' }}>{n}</span>
                          ))}
                        </div>
                      </div>

                      <div className="analysis-summary-grid">
                        <div className="as-item">
                          <span className="as-label">Total Entries</span>
                          <span className="as-value">{selectedDrawAnalysis.analysis?.totalEntries || selectedDrawAnalysis.entries?.length || 0}</span>
                        </div>
                        <div className="as-item">
                          <span className="as-label">Jackpot</span>
                          <span className="as-value ac-gold">₹{(selectedDrawAnalysis.jackpot_amount / 100).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="as-item">
                          <span className="as-label">Prize Pool</span>
                          <span className="as-value ac-green">₹{(selectedDrawAnalysis.pool_total / 100).toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <div className="tier-breakdown">
                        <h4>Prize Tier Breakdown</h4>
                        {[
                          { tier: '5-match', share: 'Jackpot', color: '#f59e0b' },
                          { tier: '4-match', share: '35% Pool', color: '#8b5cf6' },
                          { tier: '3-match', share: '25% Pool', color: '#3b82f6' }
                        ].map((t, idx) => {
                          const count = selectedDrawAnalysis.analysis?.tiers?.[t.tier]?.count || 0;
                          const pool = t.tier === '5-match' 
                            ? selectedDrawAnalysis.jackpot_amount 
                            : Math.floor(selectedDrawAnalysis.pool_total * (t.tier === '4-match' ? 0.35 : 0.25));
                          const prize = count > 0 ? Math.floor(pool / count) : 0;
                          return (
                            <div key={idx} className="tier-row" style={{ borderLeft: `4px solid ${t.color}` }}>
                              <div className="tr-main">
                                <span className="tr-title">{t.tier}</span>
                                <span className="tr-share">{t.share}</span>
                              </div>
                              <div className="tr-stats">
                                <span className="tr-count"><strong>{count}</strong> winners</span>
                                <span className="tr-prize">{count > 0 ? `₹${(prize / 100).toLocaleString('en-IN')} ea.` : '--'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Dynamic Participant Entries */}
                      {selectedDrawAnalysis.entries?.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                          <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-primary)' }}>Participant Entries</h4>
                          <div style={{ maxHeight: '280px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                              <thead>
                                <tr style={{ background: 'rgba(233,30,140,0.06)', position: 'sticky', top: 0 }}>
                                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)' }}>Participant</th>
                                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>Numbers</th>
                                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-secondary)' }}>Matches</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedDrawAnalysis.entries.map((entry, i) => {
                                  const winSet = new Set(selectedDrawAnalysis.winning_numbers);
                                  return (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', background: entry.matches >= 3 ? 'rgba(245,158,11,0.06)' : 'transparent' }}>
                                      <td style={{ padding: '0.5rem 0.8rem', fontWeight: 500 }}>{entry.name}</td>
                                      <td style={{ padding: '0.5rem 0.8rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                          {entry.numbers.map((n, j) => (
                                            <span key={j} style={{
                                              width: '30px', height: '30px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700,
                                              background: winSet.has(n) ? 'rgba(16, 185, 129, 0.12)' : 'rgba(225, 29, 72, 0.1)',
                                              color: winSet.has(n) ? '#10b981' : '#e11d48',
                                              border: `1px solid ${winSet.has(n) ? 'rgba(16, 185, 129, 0.25)' : 'rgba(225, 29, 72, 0.25)'}`,
                                              boxShadow: winSet.has(n) ? '0 2px 8px rgba(16, 185, 129, 0.2)' : 'none'
                                            }}>{n}</span>
                                          ))}
                                        </div>
                                      </td>
                                      <td style={{ padding: '0.5rem 0.8rem', textAlign: 'center' }}>
                                        <span style={{
                                          fontWeight: 800, fontSize: '0.9rem',
                                          color: entry.matches >= 5 ? '#f59e0b' : entry.matches >= 4 ? '#8b5cf6' : entry.matches >= 3 ? '#3b82f6' : 'var(--text-muted)'
                                        }}>{entry.matches}</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Published Winners */}
                      {selectedDrawAnalysis.status === 'published' && selectedDrawAnalysis.winners?.length > 0 && (
                        <div className="winners-preview">
                          <h4>Official Winners</h4>
                          <div className="winners-scroll">
                            {selectedDrawAnalysis.winners.map((w, i) => (
                              <div key={i} className="winner-mini-card">
                                <span>{w.users?.full_name}</span>
                                <span className={`match-badge mb-${w.match_type.replace('-', '')}`}>{w.match_type}</span>
                                <strong>₹{(w.prize_amount / 100).toLocaleString('en-IN')}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="form-actions" style={{ marginTop: '2rem' }}>
                        {selectedDrawAnalysis.status === 'simulated' && (
                          <button className="btn-primary" onClick={() => { handlePublish(selectedDrawAnalysis.id); setSelectedDrawAnalysis(null); }}>
                            Publish This Draw
                          </button>
                        )}
                        <button className="btn-secondary" onClick={() => setSelectedDrawAnalysis(null)}>Close</button>
                      </div>
                    </div>
                  </Modal>
                )}
              </>
            )}

            {/* ─── Winners Tab ─── */}
            {tab === 'winners' && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Entry Numbers</th>
                      <th>Winning Numbers</th>
                      <th>Match</th>
                      <th>Prize</th>
                      <th>Proof</th>
                      <th>Verification</th>
                      <th>Payment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {winners.map(w => {
                      const winSet = new Set(w.draws?.winning_numbers || []);
                      return (
                      <tr key={w.id}>
                        <td>{w.users?.full_name || '—'}</td>
                        <td>
                          <div className="draw-nums" style={{ gap: '0.25rem' }}>
                            {(w.users?.draw_numbers || []).map((n, j) => (
                              <span key={j} className="draw-num" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>{n}</span>
                            ))}
                            {(!w.users?.draw_numbers || w.users.draw_numbers.length === 0) && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>--</span>}
                          </div>
                        </td>
                        <td>
                          <div className="draw-nums" style={{ gap: '0.25rem' }}>
                            {(w.draws?.winning_numbers || []).map((n, j) => (
                              <span key={j} className="draw-num" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>{n}</span>
                            ))}
                          </div>
                        </td>
                        <td><span className={`match-badge mb-${w.match_type.replace('-', '')}`}>{w.match_type}</span></td>
                        <td className="prize-col">₹{(w.prize_amount / 100).toLocaleString('en-IN')}</td>
                        <td>
                          {w.proof_url ? (
                            <a href={w.proof_url?.startsWith('http') ? w.proof_url : `${import.meta.env.VITE_API_URL?.replace('/api', '')}${w.proof_url}`} target="_blank" rel="noreferrer" className="proof-link">View</a>
                          ) : 'None'}
                        </td>
                        <td><span className={`v-status vs-${w.verification_status}`}>{w.verification_status}</span></td>
                        <td><span className={`p-status ps-${w.payment_status}`}>{w.payment_status}</span></td>
                        <td className="action-cell">
                          {w.verification_status === 'pending' && w.proof_url && (
                            <>
                              <button className="btn-xs btn-approve" onClick={() => handleVerify(w.id, 'approved')} disabled={!!actionLoading}>✓</button>
                              <button className="btn-xs btn-reject" onClick={() => handleVerify(w.id, 'rejected')} disabled={!!actionLoading}>✕</button>
                            </>
                          )}
                          {w.verification_status === 'approved' && w.payment_status === 'pending' && (
                            <button className="btn-xs btn-pay" onClick={() => handleMarkPaid(w.id)} disabled={!!actionLoading}>Pay</button>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                {winners.length === 0 && <p className="admin-empty">No winners yet.</p>}
              </div>
            )}

            {/* ─── Charities Tab ─── */}
            {tab === 'charities' && (
              <>
                <div className="charity-form-card">
                  <h3>{editingCharity ? 'Edit Charity' : 'Add New Charity'}</h3>
                  <form onSubmit={handleCreateCharity} className="charity-admin-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Name</label>
                        <input type="text" value={charityForm.name} onChange={e => setCharityForm({ ...charityForm, name: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label>Image URL</label>
                        <input type="text" value={charityForm.image_url} onChange={e => setCharityForm({ ...charityForm, image_url: e.target.value })} placeholder="https://..." />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea value={charityForm.description} onChange={e => setCharityForm({ ...charityForm, description: e.target.value })} rows={3} required></textarea>
                    </div>
                    <div className="form-group-inline">
                      <label>
                        <input type="checkbox" checked={charityForm.featured} onChange={e => setCharityForm({ ...charityForm, featured: e.target.checked })} />
                        Featured charity
                      </label>
                    </div>
                    <div className="form-group" style={{ marginTop: '0.5rem', border: '1px solid rgba(0,0,0,0.08)', padding: '1rem', borderRadius: '8px' }}>
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        Upcoming Goals & Deadlines
                        <button 
                          type="button" 
                          className="btn-secondary btn-sm" 
                          onClick={() => setCharityForm(prev => ({ 
                            ...prev, 
                            events: [...(prev.events || []), { name: '', date: '', link: '' }] 
                          }))}
                        >
                          + Add Deadline
                        </button>
                      </label>
                      {(!charityForm.events || charityForm.events.length === 0) ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No active deadlines configured.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                          {charityForm.events.map((ev, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <input 
                                type="text" 
                                placeholder="Goal Name (e.g. Winter Drive)" 
                                value={ev.name} 
                                onChange={e => {
                                  const newEvents = [...charityForm.events];
                                  newEvents[idx].name = e.target.value;
                                  setCharityForm({ ...charityForm, events: newEvents });
                                }} 
                                style={{ flex: 1 }}
                              />
                              <input 
                                type="date" 
                                value={ev.date ? new Date(ev.date).toISOString().split('T')[0] : ''} 
                                onChange={e => {
                                  const newEvents = [...charityForm.events];
                                  newEvents[idx].date = e.target.value;
                                  setCharityForm({ ...charityForm, events: newEvents });
                                }} 
                              />
                              <button 
                                type="button" 
                                className="btn-reject btn-sm"
                                onClick={() => {
                                  const newEvents = charityForm.events.filter((_, i) => i !== idx);
                                  setCharityForm({ ...charityForm, events: newEvents });
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn-primary btn-sm" disabled={actionLoading === 'create-charity'}>
                        {actionLoading === 'create-charity' ? 'Saving...' : editingCharity ? 'Update' : 'Add Charity'}
                      </button>
                      {editingCharity && (
                        <button type="button" className="btn-secondary btn-sm" onClick={() => { setEditingCharity(null); setCharityForm({ name: '', description: '', image_url: '', featured: false, events: [] }); }}>Cancel</button>
                      )}
                    </div>
                  </form>
                </div>

                <div className="admin-charities-list">
                  {charities.map(c => (
                    <div key={c.id} className="admin-charity-item">
                      <div className="aci-left">
                        <div className="aci-img" style={{ backgroundImage: `url(${c.image_url || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=100'})` }}></div>
                        <div>
                          <h4>{c.name} {c.featured && <span className="aci-featured">Featured</span>}</h4>
                          <p>{c.description?.substring(0, 80)}...</p>
                          {c.events && c.events.length > 0 && (
                            <p style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#e11d48', fontWeight: '500' }}>
                              {c.events.length} Active {c.events.length === 1 ? 'Deadline' : 'Deadlines'} configured
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="aci-actions">
                        <button className="btn-xs btn-edit" onClick={() => startEditCharity(c)}>Edit</button>
                        <button className="btn-xs btn-delete" onClick={() => handleDeleteCharity(c.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Admin;
