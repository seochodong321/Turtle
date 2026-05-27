const fs = require('fs');
const path = require('path');

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

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const today = getKSTDateStr();

  try {
    const file = path.join(process.cwd(), 'data', 'questions.json');
    const questions = JSON.parse(fs.readFileSync(file, 'utf8'));
    const question = questions.find(q => q.date === today);

    if (!question) {
      return res.status(404).json({ error: '오늘의 질문이 준비되지 않았습니다.' });
    }

    res.json({ question, phase: getPhase(), today });
  } catch {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
