const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const SALT_ROUNDS = 10;

const register = async ({ email, password, full_name, charity_id, charity_contribution_pct }) => {
  // Check if user exists
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

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      email: email.toLowerCase(),
      password_hash,
      full_name,
      role: 'user',
      charity_id: charity_id || null,
      charity_contribution_pct: contribution,
    })
    .select('id, email, full_name, nickname, role, charity_id, charity_contribution_pct, created_at')
    .single();

  if (error) throw new Error(error.message);

  const token = generateToken(user);
  return { user, token };
};

const login = async ({ email, password }) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (!user || error) {
    throw new Error('Invalid credentials');
  }

  // Block suspended users
  if (user.role === 'suspended') {
    throw new Error('Your account has been suspended. Please contact support.');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  const token = generateToken(user);
  const { password_hash, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

const getProfile = async (userId) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, full_name, nickname, role, charity_id, charity_contribution_pct, created_at, draw_numbers')
    .eq('id', userId)
    .single();

  if (error || !user) throw new Error('User not found');
  return user;
};

const updateProfile = async (userId, updates) => {
  const allowedFields = ['full_name', 'nickname', 'charity_id', 'charity_contribution_pct', 'draw_numbers'];
  const updateData = {};
  
  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  });

  if (Object.keys(updateData).length === 0) {
    throw new Error('No valid fields to update');
  }

  // Ensure minimum contribution
  if (updateData.charity_contribution_pct) {
    updateData.charity_contribution_pct = Math.max(updateData.charity_contribution_pct, 10);
  }

  // Fetch current user state to check if charity/pct changed
  const { data: currentUser } = await supabase.from('users').select('charity_id, charity_contribution_pct').eq('id', userId).single();

  const isCharityChanged = updateData.charity_id !== undefined && updateData.charity_id !== currentUser?.charity_id;
  const isPctChanged = updateData.charity_contribution_pct !== undefined && updateData.charity_contribution_pct !== currentUser?.charity_contribution_pct;

  const { data: user, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select('id, email, full_name, nickname, role, charity_id, charity_contribution_pct, created_at, draw_numbers')
    .single();

  if (error) throw new Error(error.message);

  // Attempt to update charity accrual ledger — non-fatal if table doesn't exist yet
  try {
    if ((isCharityChanged || isPctChanged) && user.charity_id) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, expires_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (sub) {
        const now = new Date().toISOString();
        const { data: activeLog } = await supabase
          .from('subscription_charity_logs')
          .select('id')
          .eq('subscription_id', sub.id)
          .gt('end_date', now)
          .order('start_date', { ascending: false })
          .limit(1)
          .single();

        if (activeLog) {
          await supabase.from('subscription_charity_logs').update({ end_date: now }).eq('id', activeLog.id);
        }
        await supabase.from('subscription_charity_logs').insert({
          user_id: userId,
          subscription_id: sub.id,
          charity_id: user.charity_id,
          contribution_pct: user.charity_contribution_pct,
          start_date: now,
          end_date: sub.expires_at
        });
      }
    }
  } catch (logErr) {
    console.warn('Could not update subscription_charity_logs:', logErr.message);
  }

  return user;
};

// ─── FORGOT PASSWORD: Check if email exists ───
const checkEmailExists = async (email) => {
  const { data: user } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('email', email.toLowerCase())
    .single();

  if (!user) {
    throw new Error('No account found with this email address');
  }

  // Don't allow suspended users to reset password
  // (we already fetched the user, but didn't select role — let's check)
  const { data: fullUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (fullUser?.role === 'suspended') {
    throw new Error('This account has been suspended. Please contact support.');
  }

  return { exists: true, email: user.email };
};

// ─── RESET PASSWORD (for forgot-password flow) ───
const resetPassword = async (email, newPassword) => {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', email.toLowerCase())
    .single();

  if (!user) {
    throw new Error('No account found with this email address');
  }

  if (user.role === 'suspended') {
    throw new Error('This account has been suspended. Please contact support.');
  }

  const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const { error } = await supabase
    .from('users')
    .update({ password_hash })
    .eq('id', user.id);

  if (error) throw new Error(error.message);
  return { success: true };
};

// ─── DELETE OWN ACCOUNT (self-service) ───
const deleteOwnAccount = async (userId) => {
  // Delete related data in order
  await supabase.from('winners').delete().eq('user_id', userId);
  await supabase.from('scores').delete().eq('user_id', userId);
  await supabase.from('subscriptions').delete().eq('user_id', userId);
  
  try {
    await supabase.from('subscription_charity_logs').delete().eq('user_id', userId);
  } catch (e) { /* table may not exist */ }

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) throw new Error(error.message);
  return { success: true };
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

module.exports = { register, login, getProfile, updateProfile, checkEmailExists, resetPassword, deleteOwnAccount };
