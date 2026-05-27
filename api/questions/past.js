const { Redis } = require('@upstash/redis');
const fs = require('fs');
const path = require('path');
const { getKSTDateStr } = require('../_utils');

const redis = Redis.fromEnv();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const today = getKSTDateStr();
    const file = path.join(process.cwd(), 'data', 'questions.json');
    const questions = JSON.parse(fs.readFileSync(file, 'utf8'));

    const pastQuestions = questions
      .filter(q => q.date < today)
      .sort((a, b) => b.date.localeCompare(a.date));

    const past = await Promise.all(
      pastQuestions.map(async q => {
        const answers = (await redis.get(`answers:${q.date}`)) || [];
        return { ...q, answerCount: answers.length };
      })
    );

    res.json({ questions: past });
  } catch (err) {
    console.error('[questions/past]', err?.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
