const supabase = require('../config/supabase');

const MAX_SCORES = 5;

const getScores = async (userId) => {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', userId)
    .order('played_date', { ascending: false })
    .limit(MAX_SCORES);

  if (error) throw new Error(error.message);
  return data;
};

const addScore = async (userId, { score, played_date }) => {
  if (score < 1 || score > 45) {
    throw new Error('Score must be between 1 and 45 (Stableford format)');
  }

  // Get current scores count
  const { data: existing, error: fetchError } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', userId)
    .order('played_date', { ascending: true });

  if (fetchError) throw new Error(fetchError.message);

  // If already 5 scores, remove the oldest
  if (existing && existing.length >= MAX_SCORES) {
    const oldestId = existing[0].id;
    await supabase.from('scores').delete().eq('id', oldestId);
  }

  // Insert new score
  const { data: newScore, error } = await supabase
    .from('scores')
    .insert({
      user_id: userId,
      score,
      played_date,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return newScore;
};

const deleteScore = async (userId, scoreId) => {
  const { error } = await supabase
    .from('scores')
    .delete()
    .eq('id', scoreId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return { success: true };
};

const getScoresByUserId = async (userId) => {
  return getScores(userId);
};

const updateScore = async (userId, scoreId, { score, played_date }) => {
  if (score < 1 || score > 45) {
    throw new Error('Score must be between 1 and 45 (Stableford format)');
  }

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('scores')
    .select('id')
    .eq('id', scoreId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) throw new Error('Score not found or access denied');

  const { data: updated, error } = await supabase
    .from('scores')
    .update({ score, played_date })
    .eq('id', scoreId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return updated;
};

module.exports = { getScores, addScore, deleteScore, getScoresByUserId, updateScore };
