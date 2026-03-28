const supabase = require('../config/supabase');

const getAllCharities = async () => {
  const { data, error } = await supabase
    .from('charities')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

const getCharityById = async (id) => {
  const { data, error } = await supabase
    .from('charities')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Charity not found');
  return data;
};

const createCharity = async ({ name, description, image_url, gallery_images, events, featured }) => {
  const { data, error } = await supabase
    .from('charities')
    .insert({ 
      name, 
      description, 
      image_url: image_url || null, 
      gallery_images: gallery_images || [], 
      events: events || [], 
      featured: featured || false
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const updateCharity = async (id, updates) => {
  const { data, error } = await supabase
    .from('charities')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const deleteCharity = async (id) => {
  const { error } = await supabase
    .from('charities')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return { success: true };
};

const getFeaturedCharities = async () => {
  const { data, error } = await supabase
    .from('charities')
    .select('*')
    .eq('featured', true)
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

/**
 * Calculates prorated subscription impact from the ledger.
 * Each log entry accrues (days_elapsed / total_days) * amount * pct.
 * Only logs created after this ledger feature was introduced are counted.
 */
const getProratedCharityContributions = async () => {
  const now = new Date();

  // Fetch all logs joined with their parent subscription's amount
  const { data: logs, error } = await supabase
    .from('subscription_charity_logs')
    .select('charity_id, contribution_pct, start_date, end_date, subscription_id');

  if (error) throw new Error(error.message);
  if (!logs || logs.length === 0) return {};

  // Get amounts for all relevant subscriptions in one go
  const subIds = [...new Set(logs.map(l => l.subscription_id))];
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, amount, status')
    .in('id', subIds);

  const subMap = {};
  if (subs) subs.forEach(s => { subMap[s.id] = s; });

  const contributions = {};

  for (const log of logs) {
    const sub = subMap[log.subscription_id];
    if (!sub) continue;

    const start = new Date(log.start_date);
    const end = new Date(log.end_date);
    const totalDays = Math.max((end - start) / (1000 * 60 * 60 * 24), 1);

    // How many days of this log have actually elapsed?
    const effectiveEnd = now < end ? now : end;
    const elapsedDays = Math.max((effectiveEnd - start) / (1000 * 60 * 60 * 24), 0);

    // Prorated amount in paise
    const prorated = (elapsedDays / totalDays) * sub.amount * (log.contribution_pct / 100);

    const charityId = log.charity_id;
    contributions[charityId] = (contributions[charityId] || 0) + prorated;
  }

  return contributions;
};

const getCharityTotalDonations = async (id) => {
  // 1. Direct one-off donations (completed)
  const { data: donations } = await supabase
    .from('donations')
    .select('amount')
    .eq('charity_id', id)
    .eq('status', 'completed');

  let totalDirect = 0;
  if (donations) {
    totalDirect = donations.reduce((sum, d) => sum + (d.amount / 100), 0);
  }

  // 2. Prorated subscription contributions from the ledger (paise → INR)
  const contributions = await getProratedCharityContributions();
  const subContributions = Math.round((contributions[id] || 0) / 100);

  return {
    total: Math.round(totalDirect) + subContributions,
    breakdown: {
      direct: Math.round(totalDirect),
      subscriptions: subContributions,
    }
  };
};

module.exports = {
  getAllCharities,
  getCharityById,
  createCharity,
  updateCharity,
  deleteCharity,
  getFeaturedCharities,
  getProratedCharityContributions,
  getCharityTotalDonations,
};
