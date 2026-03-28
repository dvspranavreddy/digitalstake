const supabase = require('../config/supabase');

const getWinners = async (filters = {}) => {
  let query = supabase
    .from('winners')
    .select('*, users(full_name, email, draw_numbers), draws(draw_date, winning_numbers)')
    .order('created_at', { ascending: false });

  if (filters.draw_id) query = query.eq('draw_id', filters.draw_id);
  if (filters.verification_status) query = query.eq('verification_status', filters.verification_status);
  if (filters.payment_status) query = query.eq('payment_status', filters.payment_status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

const getMyWinnings = async (userId) => {
  const { data, error } = await supabase
    .from('winners')
    .select('*, draws(draw_date, winning_numbers)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

const uploadProof = async (winnerId, userId, proofUrl) => {
  // Verify the winner belongs to the user
  const { data: winner, error: fetchError } = await supabase
    .from('winners')
    .select('*')
    .eq('id', winnerId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !winner) throw new Error('Winner record not found');

  const { data, error } = await supabase
    .from('winners')
    .update({ proof_url: proofUrl, verification_status: 'pending' })
    .eq('id', winnerId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const verifyWinner = async (winnerId, status) => {
  if (!['approved', 'rejected'].includes(status)) {
    throw new Error('Status must be approved or rejected');
  }

  const { data, error } = await supabase
    .from('winners')
    .update({ verification_status: status })
    .eq('id', winnerId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

const markPaid = async (winnerId) => {
  const { data: winner } = await supabase
    .from('winners')
    .select('verification_status')
    .eq('id', winnerId)
    .single();

  if (!winner || winner.verification_status !== 'approved') {
    throw new Error('Winner must be approved before marking as paid');
  }

  const { data, error } = await supabase
    .from('winners')
    .update({ payment_status: 'paid' })
    .eq('id', winnerId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

module.exports = { getWinners, getMyWinnings, uploadProof, verifyWinner, markPaid };
