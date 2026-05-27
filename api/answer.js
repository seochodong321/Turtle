const { Redis } = require('@upstash/redis');
const { v4: uuidv4 } = require('uuid');
const { getKSTDateStr, getPhase, secondsUntilMidnightKST } = require('./_utils');

const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (getPhase() !== 'answer') {
    return res.status(403).json({ error: '답변 제출은 오전 9시부터 오후 9시 사이에만 가능합니다.' });
  }

  const { content } = req.body || {};

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: '답변 내용을 입력해주세요.' });
  }
  if (content.trim().length > 500) {
    return res.status(400).json({ error: '답변은 500자 이내로 작성해주세요.' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const today = getKSTDateStr();

  try {
    const rlKey = `rl:${ip}:${today}`;
    const already = await redis.get(rlKey);
    if (already) {
      return res.status(429).json({ error: '하루에 하나의 답변만 제출할 수 있습니다.' });
    }

    const existing = (await redis.get(`answers:${today}`)) || [];
    const newAnswer = {
      id: uuidv4(),
      questionId: today,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    await Promise.all([
      redis.set(`answers:${today}`, [...existing, newAnswer]),
      redis.set(rlKey, 1, { ex: secondsUntilMidnightKST() }),
    ]);

    res.json({ success: true, answer: newAnswer });
  } catch (err) {
    console.error('[answer]', err?.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
