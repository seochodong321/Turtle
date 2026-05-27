const fs = require('fs');
const path = require('path');
const { getKSTDateStr, getPhase } = require('../_utils');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const today = getKSTDateStr();
    const file = path.join(process.cwd(), 'data', 'questions.json');
    const questions = JSON.parse(fs.readFileSync(file, 'utf8'));
    const question = questions.find(q => q.date === today);

    if (!question) {
      return res.status(404).json({ error: '오늘의 질문이 준비되지 않았습니다.' });
    }

    res.json({ question, phase: getPhase(), today });
  } catch (err) {
    console.error('[question/today]', err?.message);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
