import { useState, useEffect, useCallback } from 'react';

// ── 시간 & 페이즈 헬퍼 ────────────────────────────────────────────────────────

function getKSTDateStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

function getKSTHour() {
  const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  return kst.getHours();
}

function calcPhase() {
  const h = getKSTHour();
  if (h < 9)  return 'preview';
  if (h < 21) return 'answer';
  return 'review';
}

function formatKSTDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
  return `${y}년 ${m}월 ${d}일 (${dow})`;
}

const PHASE_LABEL = {
  preview: '준비 중',
  answer:  '답변 시간',
  review:  '리뷰 시간',
};

// ── 실시간 시계 ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    function tick() {
      const now = new Date();
      setDate(now.toLocaleDateString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
      }));
      setTime(now.toLocaleTimeString('ko-KR', {
        timeZone: 'Asia/Seoul',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="clock-bar">
      <span className="clock-date">{date}</span>
      <span className="clock-time">{time} KST</span>
    </div>
  );
}

// ── 루트 컴포넌트 ─────────────────────────────────────────────────────────────

export default function App() {
  const [phase, setPhase]             = useState(calcPhase);
  const [question, setQuestion]       = useState(null);
  const [answers, setAnswers]         = useState([]);
  const [pastQuestions, setPastQuestions] = useState([]);
  const [content, setContent]         = useState('');
  const [submitted, setSubmitted]     = useState(false);
  const [myAnswer, setMyAnswer]       = useState('');
  const [status, setStatus]           = useState('loading');
  const [errorMsg, setErrorMsg]       = useState('');
  const [submitting, setSubmitting]   = useState(false);

  const todayKey = `answer_${getKSTDateStr()}`;
  const MAX_CHARS = 500;

  const fetchQuestion = useCallback(async () => {
    try {
      const res  = await fetch('/api/question/today');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '질문을 불러오지 못했습니다.');
      setQuestion(data.question);
      setStatus('ready');
    } catch (e) {
      setErrorMsg(e.message || '서버에 연결할 수 없습니다.');
      setStatus('error');
    }
  }, []);

  const fetchAnswers = useCallback(async () => {
    try {
      const res  = await fetch('/api/answers/today');
      const data = await res.json();
      if (res.ok) setAnswers(data.answers);
    } catch {}
  }, []);

  const fetchPastQuestions = useCallback(async () => {
    try {
      const res  = await fetch('/api/questions/past');
      const data = await res.json();
      if (res.ok) setPastQuestions(data.questions);
    } catch {}
  }, []);

  useEffect(() => {
    fetchQuestion();
    fetchPastQuestions();

    const saved = localStorage.getItem(todayKey);
    if (saved) { setSubmitted(true); setMyAnswer(saved); }

    const tick = setInterval(() => {
      setPhase(prev => {
        const next = calcPhase();
        return prev !== next ? next : prev;
      });
    }, 30_000);

    return () => clearInterval(tick);
  }, [fetchQuestion, fetchPastQuestions, todayKey]);

  useEffect(() => {
    if (phase === 'review') fetchAnswers();
  }, [phase, fetchAnswers]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res  = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem(todayKey, content.trim());
      setMyAnswer(content.trim());
      setSubmitted(true);
    } catch (e) {
      alert(e.message || '제출에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── 렌더 ─────────────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="app">
        <div className="center-state"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <span className="brand">기획자의 감각훈련소</span>
        <span className={`phase-badge phase-${phase}`}>{PHASE_LABEL[phase]}</span>
      </header>

      <LiveClock />

      <main className="main">
        {status === 'error' ? (
          <div className="center-state">
            <div className="error-icon">!</div>
            <p className="error-msg">{errorMsg}</p>
            <button className="retry-btn" onClick={fetchQuestion}>다시 시도</button>
          </div>
        ) : (
          <>
            {/* 오늘의 질문 */}
            <section className="question-block">
              <p className="question-meta">오늘의 질문</p>
              <h1 className="question-text">{question?.question}</h1>
            </section>

            {phase === 'preview' && <PreviewPhase />}
            {phase === 'answer'  && (
              <AnswerPhase
                submitted={submitted}
                myAnswer={myAnswer}
                content={content}
                setContent={setContent}
                maxChars={MAX_CHARS}
                submitting={submitting}
                onSubmit={handleSubmit}
              />
            )}
            {phase === 'review'  && (
              <ReviewPhase myAnswer={myAnswer} answers={answers} />
            )}

            {/* 지난 훈련 기록 */}
            {pastQuestions.length > 0 && (
              <PastQuestions questions={pastQuestions} />
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <p>매일 하나의 질문. 생각을 훈련합니다.</p>
      </footer>
    </div>
  );
}

// ── 페이즈별 컴포넌트 ─────────────────────────────────────────────────────────

function PreviewPhase() {
  return (
    <section className="phase-block">
      <div className="preview-card">
        <p className="preview-title">답변은 오전 9시에 시작됩니다.</p>
        <p className="preview-sub">지금은 질문을 읽고 천천히 생각을 정리해보세요.</p>
      </div>
    </section>
  );
}

function AnswerPhase({ submitted, myAnswer, content, setContent, maxChars, submitting, onSubmit }) {
  if (submitted) {
    return (
      <section className="phase-block">
        <div className="submitted-card">
          <div className="check-icon">✓</div>
          <p className="submitted-title">답변이 제출되었습니다.</p>
          <div className="answer-box">
            <p className="answer-box-label">내 답변</p>
            <p className="answer-box-text">{myAnswer}</p>
          </div>
          <p className="submitted-sub">
            오후 9시 이후에 다른 참여자의 답변을 확인할 수 있습니다.
          </p>
        </div>
      </section>
    );
  }

  const charCount = content.length;

  return (
    <section className="phase-block">
      <form className="answer-form" onSubmit={onSubmit}>
        <div className="textarea-wrap">
          <textarea
            className="answer-textarea"
            value={content}
            onChange={e => {
              if (e.target.value.length <= maxChars) setContent(e.target.value);
            }}
            placeholder="생각을 자유롭게 적어보세요."
            rows={6}
          />
          <span className={`char-count ${charCount >= maxChars ? 'at-limit' : ''}`}>
            {charCount} / {maxChars}
          </span>
        </div>
        <button type="submit" className="submit-btn" disabled={!content.trim() || submitting}>
          {submitting ? '제출 중…' : '제출하기'}
        </button>
        <p className="answer-notice">제출 후에는 수정이 불가합니다.</p>
      </form>
    </section>
  );
}

function ReviewPhase({ myAnswer, answers }) {
  return (
    <section className="phase-block">
      {myAnswer && (
        <div className="answer-box review-mine">
          <p className="answer-box-label">내 답변</p>
          <p className="answer-box-text">{myAnswer}</p>
        </div>
      )}
      <div className="answers-header">
        <span className="answers-title">모든 답변</span>
        <span className="answers-count">{answers.length}개</span>
      </div>
      {answers.length === 0 ? (
        <div className="empty-answers">아직 제출된 답변이 없습니다.</div>
      ) : (
        <ul className="answers-list">
          {answers.map((a, i) => (
            <li key={a.id} className="answer-item">
              <span className="answer-index">{i + 1}</span>
              <p className="answer-content">{a.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── 지난 훈련 기록 ────────────────────────────────────────────────────────────

function PastQuestions({ questions }) {
  return (
    <section className="past-section">
      <div className="past-header">
        <span className="past-title">지난 훈련 기록</span>
        <span className="past-total">{questions.length}개</span>
      </div>
      <ul className="past-list">
        {questions.map(q => (
          <li key={q.id} className="past-item">
            <div className="past-item-top">
              <span className="past-date">{formatKSTDate(q.date)}</span>
              {q.answerCount > 0 && (
                <span className="past-answer-count">{q.answerCount}개의 답변</span>
              )}
            </div>
            <p className="past-question">{q.question}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
