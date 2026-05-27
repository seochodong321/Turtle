const { Redis } = require('@upstash/redis');

const redis = Redis.fromEnv();

function getKSTDateStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const today = getKSTDateStr();
  const answers = (await redis.get(`answers:${today}`)) || [];

  res.json({ answers, count: answers.length });
};
