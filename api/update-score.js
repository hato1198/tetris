import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { score } = req.body;
  if (typeof score !== 'number') {
    return res.status(400).json({ error: 'Invalid score' });
  }

  // Use IP address for anonymous user ID
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userId = await hashIp(ip);

  try {
    // 1. Update overall stats (total players, average, std deviation)
    const stats = await updateOverallStats(score);

    // 2. Update weekly and all-time leaderboards
    await Promise.all([
      updateLeaderboard('leaderboard:weekly', score, userId),
      updateLeaderboard('leaderboard:all-time', score, userId),
    ]);

    // 3. Calculate percentile
    const percentile = calculatePercentile(score, stats.mean, stats.stdDev);

    res.status(200).json({
      message: 'Score updated successfully',
      percentile: percentile > 100 ? 100 : percentile.toFixed(2),
    });
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function updateOverallStats(score) {
  const pipeline = redis.pipeline();
  pipeline.incr('stats:total_players');
  pipeline.get('stats:mean');
  pipeline.get('stats:m2'); // Sum of squares of differences from the current mean

  const [totalPlayers, meanStr, m2Str] = await pipeline.exec();

  const prevCount = totalPlayers - 1;
  const prevMean = parseFloat(meanStr) || 0;
  const prevM2 = parseFloat(m2Str) || 0;

  const newMean = prevMean + (score - prevMean) / totalPlayers;
  const newM2 = prevM2 + (score - prevMean) * (score - newMean);

  await redis.set('stats:mean', newMean);
  await redis.set('stats:m2', newM2);

  const variance = totalPlayers > 1 ? newM2 / (totalPlayers - 1) : 0;
  const stdDev = Math.sqrt(variance);

  await redis.set('stats:std_dev', stdDev);

  return { mean: newMean, stdDev };
}


async function updateLeaderboard(key, score, userId) {
    const transaction = redis.multi();
    transaction.zadd(key, { score, member: userId });
    transaction.zremrangebyrank(key, 0, -6); // Keep only top 5
    if (key === 'leaderboard:weekly') {
      transaction.expire(key, 604800); // 7 days
    }
    await transaction.exec();
}

function calculatePercentile(score, mean, stdDev) {
  if (stdDev === 0) {
    return score >= mean ? 100 : 0;
  }
  // Using the normal distribution cumulative distribution function (CDF)
  // to estimate the percentile. This is an approximation.
  const z = (score - mean) / stdDev;
  const percentile = (0.5 * (1 + erf(z / Math.sqrt(2)))) * 100;
  return percentile;
}

// Helper function for the error function (erf)
function erf(x) {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = (x >= 0) ? 1 : -1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

async function hashIp(ip) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
