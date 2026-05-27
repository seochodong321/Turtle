const fs = require('fs');
const path = require('path');
const { Redis } = require('@upstash/redis');
const { getKSTDateStr, getPhase, getClientIP } = require('../_utils');

const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://turtle-ecru.vercel.app');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const today = getKSTDateStr();
    const file = path.join(process.cwd(), 'data', 'questions.json');
    const questions = JSON.parse(fs.readFileSync(file, 'utf8'));
    const todayIdx = questions.findIndex(q => q.date === today);
    const question = questions[todayIdx];

    if (!question) {
      return res.status(404).json({ error: '오늘의 질문이 준비되지 않았습니다.' });
    }

    const prevQuestion = todayIdx > 0 ? questions[todayIdx - 1] : null;
    const nextQuestion = todayIdx < questions.length - 1 ? questions[todayIdx + 1] : null;

    const ip = getClientIP(req);
    const myAnswer = await redis.get(`answer:${ip}:${today}`);

    res.json({
      question,
      phase: getPhase(),
      today,
      myAnswer: myAnswer?.content || null,
      prevQuestion,
      nextQuestion,
    });
  } catch (err) {
    console.error('[question/today]', err?.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
