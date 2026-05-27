const { Redis } = require('@upstash/redis');
const fs = require('fs');
const path = require('path');

const redis = Redis.fromEnv();

function getKSTDateStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const today = getKSTDateStr();

  try {
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
  } catch {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
