const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'store.json');

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'turtle-mvp-secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(express.static(path.join(__dirname, 'public')));

function getKSTDateInfo(date = new Date()) {
  const kstDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));

  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  const hour = kstDate.getHours();

  return {
    dateString: `${year}-${month}-${day}`,
    hour,
    timestamp: kstDate.toISOString(),
  };
}

function getPhaseByHour(hour) {
  if (hour >= 0 && hour < 9) return 'question';
  if (hour >= 9 && hour < 21) return 'answer';
  return 'review';
}

function defaultQuestionForDate(dateString) {
  return {
    id: `question-${dateString}`,
    date: dateString,
    question: `오늘의 사고 훈련 질문 (${dateString}): 오늘 당신의 생각을 가장 많이 바꾼 사건은 무엇이었나요?`,
  };
}

function ensureDataFile() {
  if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      questions: [],
      answers: [],
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

function readStore() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function getOrCreateTodayQuestion() {
  const { dateString } = getKSTDateInfo();
  const store = readStore();

  let todayQuestion = store.questions.find((q) => q.date === dateString);
  if (!todayQuestion) {
    todayQuestion = defaultQuestionForDate(dateString);
    store.questions.push(todayQuestion);
    writeStore(store);
  }

  return todayQuestion;
}

app.get('/question/today', (_req, res) => {
  const { hour } = getKSTDateInfo();
  const question = getOrCreateTodayQuestion();

  res.json({
    phase: getPhaseByHour(hour),
    timezone: 'Asia/Seoul',
    question,
  });
});

app.post('/answer', (req, res) => {
  const { hour, timestamp } = getKSTDateInfo();
  const phase = getPhaseByHour(hour);

  if (phase !== 'answer') {
    return res.status(403).json({
      message: 'Answers can only be submitted during answer phase (09:00–21:00 KST).',
    });
  }

  const content = (req.body?.content || '').trim();
  if (!content) {
    return res.status(400).json({ message: 'Answer content is required.' });
  }

  const question = getOrCreateTodayQuestion();

  if (req.session.answeredToday === question.date) {
    return res.status(409).json({ message: 'You have already submitted your answer today.' });
  }
  const store = readStore();

  const answer = {
    id: `answer-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    questionId: question.id,
    content,
    createdAt: timestamp,
  };

  store.answers.push(answer);
  writeStore(store);

  req.session.answeredToday = question.date;

  return res.status(201).json({ message: 'Answer submitted.', answer });
});

app.get('/answers/today', (_req, res) => {
  const { hour } = getKSTDateInfo();
  const phase = getPhaseByHour(hour);

  if (phase !== 'review') {
    return res.status(403).json({
      message: 'Answers are readable only during review phase (21:00–24:00 KST).',
    });
  }

  const question = getOrCreateTodayQuestion();
  const store = readStore();
  const answers = store.answers.filter((a) => a.questionId === question.id);

  return res.json({
    questionId: question.id,
    count: answers.length,
    answers,
  });
});

app.listen(PORT, () => {
  console.log(`Turtle app running at http://localhost:${PORT}`);
});
