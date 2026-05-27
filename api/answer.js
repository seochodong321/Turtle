const { Redis } = require('@upstash/redis');
const { v4: uuidv4 } = require('uuid');
const { getKSTDateStr, getPhase, getClientIP } = require('./_utils');

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

  const ip = getClientIP(req);
  const today = getKSTDateStr();
  const ipKey = `answer:${ip}:${today}`;

  try {
    const [existing, prevAnswer] = await Promise.all([
      redis.get(`answers:${today}`),
      redis.get(ipKey),
    ]);

    const pool = existing || [];
    if (!prevAnswer && pool.length >= 500) {
      return res.status(503).json({ error: '오늘의 답변이 마감되었습니다.' });
    }

    const newAnswer = {
      id: uuidv4(),
      questionId: today,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    // 기존 답변이 있으면 풀에서 제거 후 교체
    const filtered = pool.filter(a => !prevAnswer || a.id !== prevAnswer.id);

    await Promise.all([
      redis.set(`answers:${today}`, [...filtered, newAnswer]),
      redis.set(ipKey, newAnswer),
    ]);

    res.json({ success: true, answer: newAnswer });
  } catch (err) {
    console.error('[answer]', err?.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
