const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');
const ANSWERS_FILE = path.join(DATA_DIR, 'answers.json');

// ── KST 헬퍼 ─────────────────────────────────────────────────────────────────

function getKSTDateStr() {
  // YYYY-MM-DD (KST)
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

function getKSTHour() {
  const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  return kst.getHours();
}

function getPhase() {
  const h = getKSTHour();
  if (h < 9)  return 'preview'; // 00:00–09:00
  if (h < 21) return 'answer';  // 09:00–21:00
  return 'review';              // 21:00–24:00
}

// ── 파일 I/O ──────────────────────────────────────────────────────────────────

function readJSON(file) {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// ── 라우트 ────────────────────────────────────────────────────────────────────

// GET /api/question/today
app.get('/api/question/today', (req, res) => {
  const today = getKSTDateStr();
  const questions = readJSON(QUESTIONS_FILE);
  const question = questions.find(q => q.date === today);

  if (!question) {
    return res.status(404).json({ error: '오늘의 질문이 준비되지 않았습니다.' });
  }

  res.json({ question, phase: getPhase(), today });
});

// GET /api/answers/today
app.get('/api/answers/today', (req, res) => {
  const today = getKSTDateStr();
  const answers = readJSON(ANSWERS_FILE);
  const todayAnswers = answers.filter(a => a.questionId === today);
  res.json({ answers: todayAnswers, count: todayAnswers.length });
});

// POST /api/answer
app.post('/api/answer', (req, res) => {
  const phase = getPhase();

  if (phase !== 'answer') {
    return res.status(403).json({
      error: '답변 제출은 오전 9시부터 오후 9시 사이에만 가능합니다.',
    });
  }

  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: '답변 내용을 입력해주세요.' });
  }

  if (content.trim().length > 500) {
    return res.status(400).json({ error: '답변은 500자 이내로 작성해주세요.' });
  }

  const today = getKSTDateStr();
  const answers = readJSON(ANSWERS_FILE);

  const newAnswer = {
    id: uuidv4(),
    questionId: today,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  answers.push(newAnswer);
  writeJSON(ANSWERS_FILE, answers);

  res.json({ success: true, answer: newAnswer });
});

// ── 서버 시작 ─────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  const kstNow = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  console.log(`✓ 백엔드 실행 중: http://localhost:${PORT}`);
  console.log(`  KST 현재 시각: ${kstNow}`);
  console.log(`  현재 페이즈:   ${getPhase()}`);
});
