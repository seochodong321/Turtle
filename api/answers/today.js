const fs = require('fs');
const path = require('path');

const TMP_FILE = '/tmp/answers.json';
const DATA_FILE = path.join(process.cwd(), 'data', 'answers.json');

function readAnswers() {
  // /tmp는 Vercel Lambda 컨테이너 내에서 유지됨 (cold start 시 초기화)
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
  const all = readAnswers();
  const todayAnswers = all.filter(a => a.questionId === today);

  res.json({ answers: todayAnswers, count: todayAnswers.length });
};
