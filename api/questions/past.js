const { Redis } = require('@upstash/redis');
const fs = require('fs');
const path = require('path');
const { getKSTDateStr, getUserId, setCORSHeaders } = require('../_utils');

const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  setCORSHeaders(req, res, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const today = getKSTDateStr();
    const userId = getUserId(req);
    const file = path.join(process.cwd(), 'data', 'questions.json');
    const questions = JSON.parse(fs.readFileSync(file, 'utf8'));

    const pastQuestions = questions
      .filter(q => q.date < today)
      .sort((a, b) => b.date.localeCompare(a.date));

    if (pastQuestions.length === 0) {
      return res.json({ questions: [] });
    }

    const poolKeys = pastQuestions.map(q => `answers:${q.date}`);
    const myKeys   = pastQuestions.map(q => `answer:${userId}:${q.date}`);

    const [poolResults, myResults] = await Promise.all([
      redis.mget(...poolKeys),
      redis.mget(...myKeys),
    ]);

    const past = pastQuestions.map((q, i) => ({
      ...q,
      answerCount: (poolResults[i] || []).length,
      myAnswer: myResults[i]?.content || null,
    }));

    res.json({ questions: past });
  } catch (err) {
    console.error('[questions/past]', err?.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
