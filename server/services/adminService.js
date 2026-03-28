const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

const SALT_ROUNDS = 10;

const getAnalytics = async () => {
  // Total users
  const { data: users, count: userCount } = await supabase
    .from('users')
    .select('id', { count: 'exact' })
    .eq('role', 'user');

  // Active subscriptions
  const { data: activeSubs, count: activeSubCount } = await supabase
    .from('subscriptions')
    .select('id, amount', { count: 'exact' })
    .eq('status', 'active');

  // Total revenue
  const totalRevenue = activeSubs
    ? activeSubs.reduce((sum, s) => sum + (s.amount || 0), 0)
    : 0;

  // Prize pool total
  const prizePoolTotal = Math.floor(totalRevenue * 0.5);

  // Total charity contributions
  const { data: charityUsers } = await supabase
    .from('users')
    .select('charity_contribution_pct')
    .not('charity_id', 'is', null);

  const avgContribution = charityUsers && charityUsers.length > 0
    ? charityUsers.reduce((sum, u) => sum + u.charity_contribution_pct, 0) / charityUsers.length
    : 10;

  const totalCharityContributions = Math.floor(totalRevenue * (avgContribution / 100));

  // Draw statistics
  const { count: totalDraws } = await supabase
    .from('draws')
    .select('id', { count: 'exact' });

  const { count: publishedDraws } = await supabase
    .from('draws')
    .select('id', { count: 'exact' })
    .eq('status', 'published');

  // Winner statistics
  const { count: totalWinners } = await supabase
    .from('winners')
    .select('id', { count: 'exact' });

  const { data: totalPaidOut } = await supabase
    .from('winners')
    .select('prize_amount')
    .eq('payment_status', 'paid');

  const paidOutAmount = totalPaidOut
    ? totalPaidOut.reduce((sum, w) => sum + (w.prize_amount || 0), 0)
    : 0;

  // Charities count
  const { count: charityCount } = await supabase
    .from('charities')
    .select('id', { count: 'exact' });

  // Suspended users count
  const { count: suspendedCount } = await supabase
    .from('users')
    .select('id', { count: 'exact' })
    .eq('role', 'suspended');

  return {
    totalUsers: userCount || 0,
    activeSubscriptions: activeSubCount || 0,
    totalRevenue,
    prizePoolTotal,
    totalCharityContributions,
    totalDraws: totalDraws || 0,
    publishedDraws: publishedDraws || 0,
    totalWinners: totalWinners || 0,
    totalPaidOut: paidOutAmount,
    totalCharities: charityCount || 0,
    avgCharityContribution: Math.round(avgContribution),
    suspendedUsers: suspendedCount || 0,
  };
};

const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id, email, full_name, role, charity_id, charity_contribution_pct, created_at,
      subscriptions ( id, status, plan_type, expires_at )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  
  return data.map(u => {
    const activeSub = u.subscriptions?.find(s => s.status === 'active' && new Date(s.expires_at) >= new Date());
    return {
      ...u,
      subscription_status: activeSub ? 'active' : (u.subscriptions?.length > 0 ? 'expired' : 'none')
    };
  });
};

// ─── CREATE USER (admin) ───
const createUser = async ({ email, password, full_name, nickname, role, charity_id, charity_contribution_pct }) => {
  // Validate role
  if (!['admin', 'user'].includes(role)) {
    throw new Error('Role must be either "admin" or "user"');
  }

  // Check if email already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existing) {
    throw new Error('Email already registered');
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const contribution = Math.max(charity_contribution_pct || 10, 10);

  const { data, error } = await supabase
    .from('users')
    .insert({
      email: email.toLowerCase(),
      password_hash,
      full_name,
      nickname: nickname || null,
      role,
      charity_id: charity_id || null,
      charity_contribution_pct: contribution,
    })
    .select('id, email, full_name, nickname, role, charity_id, charity_contribution_pct, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// ─── UPDATE USER PROFILE (admin) ───
const updateUser = async (userId, updates) => {
  // Handle subscription cancellation (legacy)
  if (updates.cancel_subscription) {
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('status', 'active');
    return { success: true };
  }

  // Only allow admin <-> user role conversion
  if (updates.role !== undefined && !['admin', 'user'].includes(updates.role)) {
    throw new Error('Role must be either "admin" or "user"');
  }

  const allowedFields = ['full_name', 'nickname', 'email', 'role', 'charity_id', 'charity_contribution_pct'];
  const filteredUpdates = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) filteredUpdates[key] = updates[key];
  }

  // Convert empty string to null for UUID fields (Supabase rejects "" for foreign keys)
  if (filteredUpdates.charity_id === '' || filteredUpdates.charity_id === null) {
    filteredUpdates.charity_id = null;
  }

  // If email is being changed, check uniqueness
  if (filteredUpdates.email) {
    filteredUpdates.email = filteredUpdates.email.toLowerCase();
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', filteredUpdates.email)
      .neq('id', userId)
      .single();
    if (existing) throw new Error('Email already in use by another account');
  }

  const { data, error } = await supabase
    .from('users')
    .update(filteredUpdates)
    .eq('id', userId)
    .select('id, email, full_name, role, charity_id, charity_contribution_pct, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// ─── CHANGE USER PASSWORD (admin) ───
const changeUserPassword = async (userId, newPassword) => {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const { error } = await supabase
    .from('users')
    .update({ password_hash })
    .eq('id', userId);

  if (error) throw new Error(error.message);
  return { success: true };
};

// ─── SUSPEND USER (admin) ───
const suspendUser = async (userId) => {
  // Cancel any active subscriptions
  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('user_id', userId)
    .eq('status', 'active');

  // Set role to 'suspended'
  const { data, error } = await supabase
    .from('users')
    .update({ role: 'suspended' })
    .eq('id', userId)
    .select('id, email, full_name, role')
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// ─── UNSUSPEND USER (admin) ───
const unsuspendUser = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .update({ role: 'user' })
    .eq('id', userId)
    .eq('role', 'suspended')
    .select('id, email, full_name, role')
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// ─── DELETE USER (admin or self) ───
const deleteUser = async (userId) => {
  // Delete related data in order (cascade manually)
  await supabase.from('winners').delete().eq('user_id', userId);
  await supabase.from('scores').delete().eq('user_id', userId);
  await supabase.from('subscriptions').delete().eq('user_id', userId);
  
  // Try deleting charity logs (may not exist)
  try {
    await supabase.from('subscription_charity_logs').delete().eq('user_id', userId);
  } catch (e) { /* table may not exist */ }

  // Delete the user
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) throw new Error(error.message);
  return { success: true };
};

const getAllSubscriptions = async () => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      id, plan_type, status, amount, starts_at, expires_at, created_at,
      users ( id, full_name, email )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

const cancelSubscription = async (subId) => {
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('id', subId);
  if (error) throw new Error(error.message);
};

module.exports = {
  getAnalytics, getAllUsers, createUser, updateUser,
  changeUserPassword, suspendUser, unsuspendUser, deleteUser,
  getAllSubscriptions, cancelSubscription
};
