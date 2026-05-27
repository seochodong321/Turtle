const { Redis } = require('@upstash/redis');
const { v4: uuidv4 } = require('uuid');

const redis = Redis.fromEnv();

function getKSTDateStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

function getKSTHour() {
  const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  return kst.getHours();
}

function getPhase() {
  const h = getKSTHour();
  if (h < 9)  return 'preview';
  if (h < 21) return 'answer';
  return 'review';
}

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

  const today = getKSTDateStr();
  const key = `answers:${today}`;

  const existing = (await redis.get(key)) || [];
  const newAnswer = {
    id: uuidv4(),
    questionId: today,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  await redis.set(key, [...existing, newAnswer]);

  res.json({ success: true, answer: newAnswer });
};
