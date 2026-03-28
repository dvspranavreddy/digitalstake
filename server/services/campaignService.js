const supabase = require('../config/supabase');

const getAllCampaigns = async () => {
  const { data, error } = await supabase
    .from('campaigns')
    .select(`*, target_charity:charities(name)`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

const createCampaign = async (campaignData) => {
  const { name, code, type, discount_pct, target_charity_id } = campaignData;
  
  if (!name || !code || !type) {
    throw new Error('Name, code, and type are required');
  }

  // Force uppercase code
  const formattedCode = code.toUpperCase().replace(/\s+/g, '_');

  const { data: existing } = await supabase
    .from('campaigns')
    .select('id')
    .eq('code', formattedCode)
    .single();

  if (existing) {
    throw new Error('This campaign code already exists.');
  }

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      name,
      code: formattedCode,
      type,
      discount_pct: parseInt(discount_pct) || 0,
      target_charity_id: target_charity_id || null,
      active: true,
      starts_at: new Date().toISOString()
    })
    .select(`*, target_charity:charities(name)`)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const toggleCampaign = async (id, currentStatus) => {
  const { data, error } = await supabase
    .from('campaigns')
    .update({ active: !currentStatus })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const deleteCampaign = async (id) => {
  // Ensure no users are actively assigned to it before deleting (cascade protect)
  const { count } = await supabase
    .from('users')
    .select('id', { count: 'exact' })
    .eq('campaign_id', id);

  if (count > 0) {
    throw new Error(`Cannot delete campaign: ${count} users are currently assigned to it.`);
  }

  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return { success: true };
};

module.exports = {
  getAllCampaigns,
  createCampaign,
  toggleCampaign,
  deleteCampaign
};
