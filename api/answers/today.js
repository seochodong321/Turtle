const { Redis } = require('@upstash/redis');
const { getKSTDateStr, getPhase, setCORSHeaders, getLevel } = require('../_utils');

const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  setCORSHeaders(req, res, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (getPhase() !== 'review') {
    return res.status(403).json({ error: '리뷰 시간(오후 9시 이후)에만 확인할 수 있습니다.' });
  }

  try {
    const today = getKSTDateStr();
    const level = getLevel(req.query.level);
    const answers = (await redis.get(`answers:${level}:${today}`)) || [];
    res.json({ answers, count: answers.length });
  } catch (err) {
    console.error('[answers/today]', err?.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
