import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const weeklyLeaderboard = await redis.zrange('leaderboard:weekly', 0, 4, { withScores: true, rev: true });
    const allTimeLeaderboard = await redis.zrange('leaderboard:all-time', 0, 4, { withScores: true, rev: true });

    res.status(200).json({
      weekly: parseLeaderboard(weeklyLeaderboard),
      allTime: parseLeaderboard(allTimeLeaderboard),
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

function parseLeaderboard(data) {
  const leaderboard = [];
  for (let i = 0; i < data.length; i += 2) {
    leaderboard.push({
      rank: i / 2 + 1,
      userId: data[i],
      score: data[i + 1],
    });
  }
  return leaderboard;
}
