const { Redis } = require('@upstash/redis');
const { v4: uuidv4 } = require('uuid');
const { getKSTDateStr, getPhase, getUserId, setCORSHeaders, getLevel } = require('./_utils');

const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  setCORSHeaders(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (getPhase() !== 'answer') {
    return res.status(403).json({ error: '답변 제출은 오전 9시부터 오후 9시 사이에만 가능합니다.' });
  }

  const raw = (req.body || {}).content;
  // 비가시 제어문자 제거 (탭·줄바꿈 제외)
  const content = typeof raw === 'string'
    ? raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    : '';

  if (!content.trim()) {
    return res.status(400).json({ error: '답변 내용을 입력해주세요.' });
  }
  if (content.trim().length > 500) {
    return res.status(400).json({ error: '답변은 500자 이내로 작성해주세요.' });
  }

  const level = getLevel((req.body || {}).level);
  const userId = getUserId(req);
  const today = getKSTDateStr();
  const poolKey = `answers:${level}:${today}`;
  const userKey = `answer:${userId}:${today}:${level}`;

  try {
    const [existing, prevAnswer] = await Promise.all([
      redis.get(poolKey),
      redis.get(userKey),
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

    const filtered = pool.filter(a => !prevAnswer || a.id !== prevAnswer.id);

    const TTL_90D = 90 * 24 * 60 * 60;
    await Promise.all([
      redis.set(poolKey, [...filtered, newAnswer], { ex: TTL_90D }),
      redis.set(userKey, newAnswer),
    ]);

    res.json({ success: true, answer: newAnswer });
  } catch (err) {
    console.error('[answer]', err?.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
