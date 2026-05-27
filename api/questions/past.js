const fs = require('fs');
const path = require('path');

const TMP_FILE  = '/tmp/answers.json';
const DATA_FILE = path.join(process.cwd(), 'data', 'answers.json');

function readAnswers() {
  if (fs.existsSync(TMP_FILE)) {
    try { return JSON.parse(fs.readFileSync(TMP_FILE, 'utf8')); } catch {}
  }
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch {}
  return [];
}

function getKSTDateStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
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
    const answers   = readAnswers();

    const past = questions
      .filter(q => q.date < today)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(q => ({
        ...q,
        answerCount: answers.filter(a => a.questionId === q.date).length,
      }));

    res.json({ questions: past });
  } catch {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
