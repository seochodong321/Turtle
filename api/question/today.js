const fs = require('fs');
const path = require('path');
const { Redis } = require('@upstash/redis');
const { getKSTDateStr, getPhase, getUserId, setCORSHeaders } = require('../_utils');

const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  setCORSHeaders(req, res, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const today = getKSTDateStr();
    const file = path.join(process.cwd(), 'data', 'questions.json');
    const questions = JSON.parse(fs.readFileSync(file, 'utf8'));
    const entry = questions.find(q => q.date === today);

    if (!entry) {
      return res.status(404).json({ error: '오늘의 질문이 준비되지 않았습니다.' });
    }

    const level = req.query.level === 'junior' ? 'junior' : 'senior';
    const userId = getUserId(req);
    const myAnswer = await redis.get(`answer:${userId}:${today}:${level}`);

    res.json({
      question: entry[level],
      phase: getPhase(),
      today,
      myAnswer: myAnswer?.content || null,
      level,
    });
  } catch (err) {
    console.error('[question/today]', err?.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
