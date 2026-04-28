const { useEffect, useState } = React;

function phaseLabel(phase) {
  if (phase === 'question') return 'Question Phase (00:00-09:00 KST)';
  if (phase === 'answer') return 'Answer Phase (09:00-21:00 KST)';
  return 'Review Phase (21:00-24:00 KST)';
}

function App() {
  const [phase, setPhase] = useState('question');
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function loadQuestion() {
    const res = await fetch('/question/today');
    const data = await res.json();
    setQuestion(data.question);
    setPhase(data.phase);
  }

  async function loadAnswers() {
    const res = await fetch('/answers/today');
    if (!res.ok) {
      setAnswers([]);
      return;
    }

    const data = await res.json();
    setAnswers(data.answers || []);
  }

  useEffect(() => {
    loadQuestion().catch(() => setMessage('질문을 불러오지 못했습니다.'));
  }, []);

  useEffect(() => {
    if (phase === 'review') {
      loadAnswers().catch(() => setMessage('답변을 불러오지 못했습니다.'));
    }
  }, [phase]);

  async function submitAnswer(e) {
    e.preventDefault();
    setMessage('');

    const res = await fetch('/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.message || '제출에 실패했습니다.');
      return;
    }

    setSubmitted(true);
    setContent('');
    setMessage('답변이 제출되었습니다.');
  }

  return (
    <main className="container">
      <h1>Daily Cognitive Training</h1>
      <p className="badge">{phaseLabel(phase)}</p>

      {question ? (
        <section>
          <h2>오늘의 질문</h2>
          <p>{question.question}</p>
        </section>
      ) : (
        <p>Loading question...</p>
      )}

      {phase === 'question' && <p className="muted">지금은 질문을 읽는 시간입니다.</p>}

      {phase === 'answer' && (
        <section>
          <h2>답변 작성</h2>
          <form onSubmit={submitAnswer}>
            <textarea
              placeholder="오늘의 생각을 작성하세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={submitted}
            />
            <br />
            <button type="submit" disabled={submitted || !content.trim()}>
              {submitted ? '제출 완료' : '답변 제출'}
            </button>
          </form>
        </section>
      )}

      {phase === 'review' && (
        <section>
          <h2>오늘 제출된 답변</h2>
          {answers.length === 0 ? (
            <p className="muted">아직 제출된 답변이 없습니다.</p>
          ) : (
            <ul>
              {answers.map((answer) => (
                <li key={answer.id}>{answer.content}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {message && <p className="message">{message}</p>}
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
