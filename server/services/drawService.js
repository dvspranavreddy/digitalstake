const supabase = require('../config/supabase');

const POOL_DISTRIBUTION = {
  '5-match': 0.40,
  '4-match': 0.35,
  '3-match': 0.25,
};

/**
 * Generates 5 winning numbers.
 * - 'random': Pure random (standard lottery)
 * - 'most_frequent': The 5 numbers users pick most often (more winners)
 * - 'least_frequent': The 5 numbers users pick least often (fewer winners)
 * - 'guarantee_winner': Uses a random user's exact numbers (guaranteed 5-match winner)
 * Ties are broken randomly to avoid predictable draws.
 */
const generateDrawNumbers = async (logicOption = 'random') => {
  // Pure random
  if (logicOption === 'random') {
    const nums = new Set();
    while (nums.size < 5) nums.add(Math.floor(Math.random() * 45) + 1);
    return Array.from(nums).sort((a, b) => a - b);
  }

  // Guarantee winner: pick a random user's exact locked numbers
  if (logicOption === 'guarantee_winner') {
    const { data: eligible } = await supabase
      .from('users')
      .select('id, draw_numbers')
      .not('draw_numbers', 'is', null);

    const withNumbers = (eligible || []).filter(
      u => Array.isArray(u.draw_numbers) && u.draw_numbers.length === 5
    );

    if (withNumbers.length === 0) {
      // Fallback to random if no users have locked numbers
      const nums = new Set();
      while (nums.size < 5) nums.add(Math.floor(Math.random() * 45) + 1);
      return Array.from(nums).sort((a, b) => a - b);
    }

    const winner = withNumbers[Math.floor(Math.random() * withNumbers.length)];
    console.log(`[DRAW] Guarantee winner mode: using numbers from user ${winner.id}`);
    return [...winner.draw_numbers].sort((a, b) => a - b);
  }

  // Frequency-based: count each number across all users' locked picks
  const freq = {};
  for (let i = 1; i <= 45; i++) freq[i] = 0;

  const { data: usersData } = await supabase
    .from('users')
    .select('draw_numbers')
    .not('draw_numbers', 'is', null);

  if (usersData) {
    usersData.forEach(u => {
      if (Array.isArray(u.draw_numbers)) {
        u.draw_numbers.forEach(n => {
          if (n >= 1 && n <= 45) freq[n]++;
        });
      }
    });
  }

  // Sort by frequency, break ties randomly
  const sorted = Object.entries(freq)
    .map(([num, count]) => ({ num: parseInt(num), count, tieBreaker: Math.random() }))
    .sort((a, b) => {
      if (logicOption === 'most_frequent') {
        return b.count - a.count || a.tieBreaker - b.tieBreaker;
      } else {
        return a.count - b.count || a.tieBreaker - b.tieBreaker;
      }
    });

  return sorted.slice(0, 5).map(s => s.num).sort((a, b) => a - b);
};

/**
 * Calculates match distribution for a set of entries against winning numbers.
 */
const calculateMatchDistribution = (entries, winningNumbers) => {
  const drawnSet = new Set(winningNumbers);
  const distribution = {
    '5-match': [],
    '4-match': [],
    '3-match': [],
  };

  entries.forEach(entry => {
    const matches = entry.numbers.filter(n => drawnSet.has(n)).length;
    if (matches >= 5) distribution['5-match'].push(entry);
    else if (matches >= 4) distribution['4-match'].push(entry);
    else if (matches >= 3) distribution['3-match'].push(entry);
  });

  return distribution;
};

const simulateDraw = async (logicOption = 'random') => {
  try {
    // 0. Monthly lock: block simulations if a draw is already published this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data: publishedThisMonth } = await supabase
      .from('draws')
      .select('id')
      .eq('status', 'published')
      .gte('draw_date', startOfMonth)
      .lte('draw_date', endOfMonth)
      .limit(1);

    if (publishedThisMonth && publishedThisMonth.length > 0) {
      throw new Error('A draw has already been published this month. New simulations will be available from the 1st of next month.');
    }

    // 1. Get active subscribers (simple query, no join)
    const { data: activeSubs, error: subsError } = await supabase
      .from('subscriptions')
      .select('user_id, plan_type, amount')
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString());

    if (subsError) {
      console.error('[DRAW] Subscriptions query failed:', subsError);
      throw new Error(subsError.message);
    }
    if (!activeSubs || activeSubs.length === 0) {
      throw new Error('No active subscribers for draw');
    }

    console.log(`[DRAW] Found ${activeSubs.length} active subscribers`);

    // 2. Calculate dynamic pool
    let poolTotal = 0;
    activeSubs.forEach(sub => {
      if (sub.plan_type === 'monthly') {
        poolTotal += Math.floor(sub.amount * 0.5);
      } else if (sub.plan_type === 'yearly') {
        poolTotal += Math.floor((sub.amount * 0.5) / 12);
      }
    });

    // 3. Check for jackpot rollover
    const { data: lastDraw } = await supabase
      .from('draws')
      .select('*')
      .eq('status', 'published')
      .order('draw_date', { ascending: false })
      .limit(1);

    let jackpotRollover = 0;
    if (lastDraw && lastDraw.length > 0) {
      const { data: fiveMatchWinners } = await supabase
        .from('winners')
        .select('id')
        .eq('draw_id', lastDraw[0].id)
        .eq('match_type', '5-match');

      if (!fiveMatchWinners || fiveMatchWinners.length === 0) {
        jackpotRollover = lastDraw[0].jackpot_amount || 0;
      }
    }

    // 4. Generate winning numbers
    const winningNumbers = await generateDrawNumbers(logicOption);
    const currentDraw5MatchPool = Math.floor(poolTotal * POOL_DISTRIBUTION['5-match']);
    const jackpotAmount = currentDraw5MatchPool + jackpotRollover;

    console.log(`[DRAW] Winning numbers: ${winningNumbers}, Pool: ${poolTotal}, Jackpot: ${jackpotAmount}`);

    // 5. Create draw record
    const { data: draw, error: drawInsertError } = await supabase
      .from('draws')
      .insert({
        draw_date: new Date().toISOString().split('T')[0],
        winning_numbers: winningNumbers,
        status: 'simulated',
        jackpot_amount: jackpotAmount,
        pool_total: poolTotal,
      })
      .select()
      .single();

    if (drawInsertError) {
      console.error('[DRAW] Draw insert failed:', drawInsertError);
      throw new Error(drawInsertError.message);
    }

    console.log(`[DRAW] Draw record created: ${draw.id}`);

    // 6. Fetch user draw_numbers (separate simple query)
    const userIds = activeSubs.map(s => s.user_id);
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, draw_numbers')
      .in('id', userIds);

    if (usersError) {
      console.error('[DRAW] Users query failed:', usersError);
      throw new Error(usersError.message);
    }

    const userNumbersMap = {};
    if (allUsers) {
      allUsers.forEach(u => { userNumbersMap[u.id] = u.draw_numbers; });
    }

    // 7. Build entries
    const entries = activeSubs.map(sub => {
      let numbers = [];
      const userNumbers = userNumbersMap[sub.user_id];

      if (userNumbers && Array.isArray(userNumbers) && userNumbers.length === 5) {
        numbers = [...userNumbers].sort((a, b) => a - b);
      } else {
        const fallback = new Set();
        while (fallback.size < 5) fallback.add(Math.floor(Math.random() * 45) + 1);
        numbers = Array.from(fallback).sort((a, b) => a - b);
      }

      return { draw_id: draw.id, user_id: sub.user_id, numbers };
    });

    // 8. Save entries
    if (entries.length > 0) {
      await chunkedInsert('draw_entries', entries);
    }

    console.log(`[DRAW] ${entries.length} entries saved`);

    // 9. Pre-analysis
    const distribution = calculateMatchDistribution(entries, winningNumbers);
    const analysis = {
      totalEntries: entries.length,
      tiers: {
        '5-match': { count: distribution['5-match'].length, totalPool: jackpotAmount, individualPrize: 0 },
        '4-match': { count: distribution['4-match'].length, totalPool: Math.floor(poolTotal * POOL_DISTRIBUTION['4-match']), individualPrize: 0 },
        '3-match': { count: distribution['3-match'].length, totalPool: Math.floor(poolTotal * POOL_DISTRIBUTION['3-match']), individualPrize: 0 },
      }
    };

    Object.keys(analysis.tiers).forEach(tier => {
      const t = analysis.tiers[tier];
      if (t.count > 0) t.individualPrize = Math.floor(t.totalPool / t.count);
    });

    console.log(`[DRAW] Simulation complete. 5-match: ${analysis.tiers['5-match'].count}, 4-match: ${analysis.tiers['4-match'].count}, 3-match: ${analysis.tiers['3-match'].count}`);

    return { draw, analysis };
  } catch (err) {
    console.error('[DRAW] simulateDraw FAILED:', err.message, err.stack);
    throw err;
  }
};

const publishDraw = async (drawId) => {
  // Fetch draw
  const { data: draw, error: drawError } = await supabase
    .from('draws')
    .select('*')
    .eq('id', drawId)
    .single();

  if (drawError || !draw) throw new Error('Draw not found');
  if (draw.status === 'published') throw new Error('Draw already published');

  // 1. Monthly Cadence Guard: Only one published draw per calendar month
  const drawDate = new Date(draw.draw_date);
  const startOfMonth = new Date(drawDate.getFullYear(), drawDate.getMonth(), 1).toISOString();
  const endOfMonth = new Date(drawDate.getFullYear(), drawDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: existingPublished } = await supabase
    .from('draws')
    .select('id')
    .eq('status', 'published')
    .gte('draw_date', startOfMonth)
    .lte('draw_date', endOfMonth)
    .limit(1);

  if (existingPublished && existingPublished.length > 0) {
    throw new Error('A draw has already been published for this calendar month. Only one official draw per month is permitted.');
  }

  // Calculate prizes
  const poolTotal = draw.pool_total;
  const tiers = {
    '5-match': { pool: draw.jackpot_amount, winners: [] }, // 5-match uses the already calculated jackpot_amount
    '4-match': { pool: Math.floor(poolTotal * POOL_DISTRIBUTION['4-match']), winners: [] },
    '3-match': { pool: Math.floor(poolTotal * POOL_DISTRIBUTION['3-match']), winners: [] },
  };

  // Get entries
  const { data: entries, error: entriesError } = await supabase
    .from('draw_entries')
    .select('*')
    .eq('draw_id', drawId);

  if (entriesError) throw new Error(entriesError.message);

  if (entries) {
    const distribution = calculateMatchDistribution(entries, draw.winning_numbers);
    tiers['5-match'].winners = distribution['5-match'];
    tiers['4-match'].winners = distribution['4-match'];
    tiers['3-match'].winners = distribution['3-match'];
  }

  // Insert winners with calculated prizes
  const winnerRecords = [];
  for (const [matchType, tier] of Object.entries(tiers)) {
    if (tier.winners.length > 0) {
      const prizePerWinner = Math.floor(tier.pool / tier.winners.length);
      for (const winner of tier.winners) {
        winnerRecords.push({
          draw_id: drawId,
          user_id: winner.user_id,
          match_type: matchType,
          prize_amount: prizePerWinner,
          verification_status: 'pending',
          payment_status: 'pending',
        });
      }
    }
  }

  if (winnerRecords.length > 0) {
    await chunkedInsert('winners', winnerRecords);
  }

  // Update draw status
  const { error: updateError } = await supabase
    .from('draws')
    .update({ status: 'published' })
    .eq('id', drawId);

  if (updateError) throw new Error(updateError.message);

  // 2. Simulation Cleanup: Delete all other 'simulated' draws in the same month
  await supabase
    .from('draws')
    .delete()
    .eq('status', 'simulated')
    .neq('id', drawId)
    .gte('draw_date', startOfMonth)
    .lte('draw_date', endOfMonth);

  return {
    draw_id: drawId,
    winners: winnerRecords.length,
    jackpot_won: tiers['5-match'].winners.length > 0,
    tiers: {
      '5-match': tiers['5-match'].winners.length,
      '4-match': tiers['4-match'].winners.length,
      '3-match': tiers['3-match'].winners.length,
    },
  };
};

const getMyDrawsCount = async (userId) => {
  const { count, error } = await supabase
    .from('draw_entries')
    .select('draw_id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return count || 0;
};

const getDraws = async () => {
  const { data, error } = await supabase
    .from('draws')
    .select('*')
    .order('draw_date', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

const getDrawById = async (id) => {
  const { data: draw, error } = await supabase
    .from('draws')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);

  // Get official winners if published
  const { data: winners } = await supabase
    .from('winners')
    .select('*, users(full_name, email)')
    .eq('draw_id', id);

  // Fetch all entries with user info for this draw
  const { data: rawEntries } = await supabase
    .from('draw_entries')
    .select('user_id, numbers, users(full_name)')
    .eq('draw_id', id);

  const drawnSet = new Set(draw.winning_numbers);
  const entries = (rawEntries || []).map(e => ({
    user_id: e.user_id,
    name: e.users?.full_name || 'Unknown',
    numbers: e.numbers,
    matches: e.numbers.filter(n => drawnSet.has(n)).length,
  }));

  // Sort entries: highest matches first
  entries.sort((a, b) => b.matches - a.matches);

  // Build analysis from entries
  let analysis = null;
  if (entries.length > 0) {
    const distribution = calculateMatchDistribution(
      entries.map(e => ({ numbers: e.numbers })),
      draw.winning_numbers
    );
    analysis = {
      totalEntries: entries.length,
      tiers: {
        '5-match': { count: distribution['5-match'].length },
        '4-match': { count: distribution['4-match'].length },
        '3-match': { count: distribution['3-match'].length },
      }
    };
  }

  return { ...draw, winners: winners || [], entries, analysis };
};

const chunkedInsert = async (table, records, chunkSize = 500) => {
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.error(`Error in chunked insert for ${table}:`, error);
      throw new Error(`Failed to save data to ${table}: ${error.message}`);
    }
  }
};

module.exports = { simulateDraw, publishDraw, getDraws, getDrawById, generateDrawNumbers, getMyDrawsCount };
