const { Redis } = require('@upstash/redis');
const { getKSTDateStr } = require('../_utils');

const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const today = getKSTDateStr();
    const answers = (await redis.get(`answers:${today}`)) || [];
    res.json({ answers, count: answers.length });
  } catch (err) {
    console.error('[answers/today]', err?.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
