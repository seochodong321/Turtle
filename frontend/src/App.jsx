import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getAnonymousKey, Storage } from '@apps-in-toss/web-framework';

async function saveLevel(lv) {
  try { await Storage.setItem('userLevel', lv); } catch {}
  try { localStorage.setItem('userLevel', lv); } catch {}
}
async function loadLevel() {
  try { const v = await Storage.getItem('userLevel'); if (v) return v; } catch {}
  try { return localStorage.getItem('userLevel') || null; } catch {}
  return null;
}

// 개발(vite proxy): 상대 URL / 빌드(ait build): Vercel 절대 URL
const API_BASE = import.meta.env.PROD ? 'https://turtle-ecru.vercel.app' : '';

// ── 용어 사전 ──────────────────────────────────────────────────────────────────

const GLOSSARY = [
  // 제품 전략
  { terms: ['MVP'],            def: '최소 기능 제품(Minimum Viable Product). 핵심 기능만 넣어 빠르게 출시하고 시장 반응을 검증하는 초기 제품.' },
  { terms: ['PMF'],            def: '제품-시장 적합성(Product-Market Fit). 제품이 특정 시장의 필요를 잘 충족하고 있는 상태.' },
  { terms: ['GTM', 'Go-to-Market'], def: '시장 진입 전략(Go-To-Market). 새 제품·기능을 어떤 타깃에게, 어떤 채널로, 어떤 메시지로 출시할지의 계획.' },
  { terms: ['피벗', 'Pivot'],  def: '핵심 전제는 유지하되 전략이나 방향을 큰 폭으로 전환하는 것.' },
  { terms: ['린', 'Lean'],     def: '낭비를 최소화하고 빠른 실험·학습을 반복하는 개발·경영 방법론.' },
  { terms: ['프로토타입'],      def: '실제 출시 전 아이디어를 검증하기 위해 만드는 초기 시제품. 완성도보다 검증 속도가 목적.' },
  // 지표
  { terms: ['DAU'],            def: '일간 활성 사용자 수(Daily Active Users). 하루 동안 서비스를 실제 사용한 유저 수.' },
  { terms: ['MAU'],            def: '월간 활성 사용자 수(Monthly Active Users). 한 달 동안 서비스를 실제 사용한 유저 수.' },
  { terms: ['WAU'],            def: '주간 활성 사용자 수(Weekly Active Users). 일주일 동안 서비스를 실제 사용한 유저 수.' },
  { terms: ['KPI'],            def: '핵심 성과 지표(Key Performance Indicator). 목표 달성 여부를 측정하는 수치 지표.' },
  { terms: ['OKR'],            def: '목표와 핵심 결과(Objectives & Key Results). 도전적 목표(O)를 세우고 달성 여부를 측정 가능한 결과(KR)로 정의하는 목표 관리 방법.' },
  { terms: ['NPS'],            def: '순추천지수(Net Promoter Score). "이 서비스를 지인에게 추천하겠냐"로 고객 만족도를 0–10점으로 측정하는 지표.' },
  { terms: ['ROI'],            def: '투자 대비 수익률(Return on Investment). 투입 비용 대비 얼마나 성과를 냈는지 나타내는 비율.' },
  { terms: ['CAC'],            def: '고객 획득 비용(Customer Acquisition Cost). 신규 고객 한 명을 유치하는 데 드는 평균 비용.' },
  { terms: ['LTV', 'CLV'],     def: '고객 생애 가치(Lifetime Value). 한 고객이 서비스를 이용하는 전체 기간에 걸쳐 창출하는 예상 수익.' },
  { terms: ['GMV'],            def: '총 거래액(Gross Merchandise Volume). 플랫폼에서 일정 기간 발생한 전체 거래 금액.' },
  { terms: ['ARR'],            def: '연간 반복 매출(Annual Recurring Revenue). 구독 등으로 매년 안정적으로 발생하는 매출.' },
  { terms: ['MRR'],            def: '월간 반복 매출(Monthly Recurring Revenue). 구독 등으로 매달 안정적으로 발생하는 매출.' },
  { terms: ['AARRR'],          def: '해적 지표(Acquisition-Activation-Retention-Referral-Revenue). 사용자 유입부터 수익까지 5단계로 성장을 진단하는 프레임워크.' },
  { terms: ['리텐션', 'Retention'], def: '사용자가 서비스를 계속 사용하는 비율. 높을수록 제품이 습관으로 자리잡았다는 신호.' },
  { terms: ['이탈률', 'Churn'], def: '일정 기간 서비스를 그만 사용한 사용자의 비율.' },
  { terms: ['전환율', 'CVR'],  def: '목표 행동(결제·가입 등)을 완료한 사용자의 비율. 퍼널 효율을 나타냄.' },
  // UX
  { terms: ['UX'],             def: '사용자 경험(User Experience). 사용자가 제품을 사용하며 느끼는 전반적인 경험.' },
  { terms: ['UI'],             def: '사용자 인터페이스(User Interface). 사용자가 제품과 상호작용하는 화면·버튼·아이콘 등 시각적 요소.' },
  { terms: ['CTA'],            def: '행동 유도 요소(Call to Action). 사용자에게 특정 행동을 요청하는 버튼이나 문구. 예: "지금 시작하기".' },
  { terms: ['와이어프레임'],    def: '화면의 구조와 요소 배치를 단순하게 표현한 설계 도면. 디자인보다 구조·흐름 검토가 목적.' },
  { terms: ['사용성 테스트'],   def: '실제 사용자가 제품을 쓰는 과정을 관찰해 문제를 발견하는 테스트.' },
  { terms: ['온보딩', 'Onboarding'], def: '신규 사용자가 서비스의 핵심 가치를 빠르게 경험하도록 안내하는 첫 사용 흐름.' },
  { terms: ['퍼널', 'Funnel'], def: '사용자가 목표 행동(구매·가입 등)에 이르는 단계별 흐름. 각 단계에서 이탈 원인을 분석할 때 씀.' },
  { terms: ['유저 저니', 'User Journey'], def: '사용자가 특정 목표를 달성하기까지 겪는 전체 경험과 감정의 흐름을 시각화한 것.' },
  { terms: ['IA'],             def: '정보 구조(Information Architecture). 서비스 안의 콘텐츠·메뉴를 사용자가 쉽게 찾을 수 있도록 체계화하는 설계.' },
  { terms: ['A/B 테스트'],     def: '두 가지 버전(A·B)을 실제 사용자에게 동시에 노출해 어느 쪽이 더 나은지 데이터로 검증하는 실험.' },
  // 개발 프로세스
  { terms: ['스프린트', 'Sprint'], def: '1–4주의 짧은 주기로 목표를 정해 개발·검증을 반복하는 애자일 사이클.' },
  { terms: ['백로그', 'Backlog'],  def: '앞으로 개발해야 할 기능·작업의 우선순위 목록.' },
  { terms: ['애자일', 'Agile'],    def: '짧은 주기로 기획·개발·검증을 반복하며 변화에 유연하게 대응하는 방법론.' },
  { terms: ['스쿼드', 'Squad'],    def: '특정 목표를 공유하는 소규모 자율 팀. 기획·디자인·개발이 함께 구성.' },
  // 비즈니스 모델
  { terms: ['SaaS'],           def: '구독형 소프트웨어 서비스(Software as a Service). 소프트웨어를 설치 없이 월·연 구독으로 사용하는 방식.' },
  { terms: ['B2B'],            def: '기업 간 거래(Business to Business). 고객이 개인이 아닌 다른 기업인 비즈니스 모델.' },
  { terms: ['B2C'],            def: '기업-소비자 거래(Business to Consumer). 기업이 일반 소비자에게 직접 제품·서비스를 판매하는 모델.' },
  { terms: ['B2B2C'],          def: '기업이 다른 기업을 통해 최종 소비자에게 도달하는 복합 비즈니스 모델.' },
  { terms: ['PM'],             def: '프로덕트 매니저(Product Manager). 제품의 방향과 우선순위를 결정하고 팀을 조율하는 역할.' },
  { terms: ['PO'],             def: '프로덕트 오너(Product Owner). 스크럼 팀에서 백로그를 관리하고 제품 가치를 책임지는 역할.' },
  { terms: ['프리미엄', 'Freemium'], def: '기본 기능은 무료로 제공하고 고급 기능에 요금을 부과하는 수익 모델.' },
];

// RegExp를 모듈 로드 시 한 번만 컴파일 (매 렌더 재컴파일 방지)
const COMPILED_GLOSSARY = GLOSSARY.map(entry => ({
  term: entry.terms[0],
  def:  entry.def,
  patterns: entry.terms.map(term => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return /^[A-Za-z0-9/]/.test(term)
      ? new RegExp(`\\b${escaped}\\b`)
      : new RegExp(escaped);
  }),
}));

function getGlossaryHints(text) {
  if (!text) return [];
  return COMPILED_GLOSSARY
    .filter(e => e.patterns.some(p => p.test(text)))
    .map(e => ({ term: e.term, def: e.def }));
}

// ── 스트릭 계산 ───────────────────────────────────────────────────────────────

function calcStreak(pastQuestions, todayAnswered) {
  const kst = d => new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const today = kst(new Date());
  const answeredSet = new Set(
    pastQuestions.filter(q => q.myAnswer).map(q => q.date)
  );
  if (todayAnswered) {
    answeredSet.add(today.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }));
  }

  let streak = 0;
  const d = new Date(today);
  if (!todayAnswered) d.setDate(d.getDate() - 1);

  while (true) {
    const ds = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
    if (answeredSet.has(ds)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

// ── 시간 & 페이즈 헬퍼 ────────────────────────────────────────────────────────

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
  preview: '답변 준비',
  answer:  '답변 시간',
  review:  '리뷰&스터디 시간',
};

// ── 카운트다운 훅 ─────────────────────────────────────────────────────────────

function useCountdownToHour(targetHour) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    function tick() {
      const now = new Date();
      const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
      const end = new Date(kst);
      end.setHours(targetHour, 0, 0, 0);

      const diff = end - kst;
      if (diff <= 0) { setRemaining(''); return; }

      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);

      const parts = [];
      if (h > 0) parts.push(`${h}시간`);
      parts.push(`${String(m).padStart(2, '0')}분`);
      parts.push(`${String(s).padStart(2, '0')}초`);
      setRemaining(parts.join(' '));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetHour]);

  return remaining;
}

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

// ── 이용 안내 ─────────────────────────────────────────────────────────────────

const GUIDE_ITEMS = [
  { phase: 'preview', time: '자정 – 오전 9시',    desc: '오늘의 질문을 읽고 혼자 생각을 정리하는 시간' },
  { phase: 'answer',  time: '오전 9시 – 오후 9시', desc: '오늘의 질문에 나만의 답변을 작성하고 제출하는 시간' },
  { phase: 'review',  time: '오후 9시 – 자정',    desc: '기획자들의 답변을 확인하고, 비교하며 공부하는 시간' },
];

function PhaseGuide({ currentPhase }) {
  return (
    <div className="guide">
      <p className="guide-label">이용 안내</p>
      <ul className="guide-list">
        {GUIDE_ITEMS.map(item => (
          <li
            key={item.phase}
            className={`guide-item${currentPhase === item.phase ? ' guide-active' : ''}`}
          >
            <span className="guide-time">{item.time}</span>
            <span className="guide-desc">{item.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── 루트 컴포넌트 ─────────────────────────────────────────────────────────────

export default function App() {
  const [phase, setPhase]                 = useState(calcPhase);
  const [level, setLevel]                 = useState(null);  // null=미선택 'junior'|'senior'
  const [question, setQuestion]           = useState(null);
  const [answers, setAnswers]             = useState([]);
  const [answerCount, setAnswerCount]     = useState(null);
  const [pastQuestions, setPastQuestions] = useState([]);
  const [content, setContent]             = useState('');
  const [submitted, setSubmitted]         = useState(false);
  const [myAnswer, setMyAnswer]           = useState('');
  const [status, setStatus]               = useState('loading');
  const [errorMsg, setErrorMsg]           = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [submitError, setSubmitError]     = useState('');

  const userKeyRef  = useRef(null);
  const levelRef    = useRef(null);  // stale closure 방지용
  const [pastExpanded, setPastExpanded] = useState(false);

  const MAX_CHARS = 500;
  const PAST_LIMIT = 10;

  function userHeaders(extra = {}) {
    return userKeyRef.current
      ? { ...extra, 'x-user-key': userKeyRef.current }
      : extra;
  }

  async function ensureUserKey() {
    if (userKeyRef.current) return;
    try {
      const result = await getAnonymousKey();
      if (result && result !== 'ERROR' && result.hash) {
        userKeyRef.current = result.hash;
      }
    } catch {}
  }

  const fetchQuestion = useCallback(async () => {
    const lv = levelRef.current;
    try {
      const res  = await fetch(`${API_BASE}/api/question/today?level=${lv}`, { headers: userHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '질문을 불러오지 못했습니다.');
      setQuestion(data.question);
      if (data.myAnswer) {
        setMyAnswer(data.myAnswer);
        setContent(data.myAnswer);
        setSubmitted(true);
      } else {
        setMyAnswer('');
        setContent('');
        setSubmitted(false);
      }
      setStatus('ready');
    } catch (e) {
      setErrorMsg(e.message || '서버에 연결할 수 없습니다.');
      setStatus('error');
    }
  }, []);

  const fetchAnswers = useCallback(async () => {
    const lv = levelRef.current;
    try {
      const res  = await fetch(`${API_BASE}/api/answers/today?level=${lv}`);
      const data = await res.json();
      if (res.ok) { setAnswers(data.answers); setAnswerCount(data.count); }
    } catch {}
  }, []);

  const fetchPastQuestions = useCallback(async () => {
    const lv = levelRef.current;
    try {
      const res  = await fetch(`${API_BASE}/api/questions/past?level=${lv}`, { headers: userHeaders() });
      const data = await res.json();
      if (res.ok) setPastQuestions(data.questions);
    } catch {}
  }, []);

  // 레벨 선택 처리 (최초 선택 or 전환)
  const selectLevel = useCallback(async (lv) => {
    levelRef.current = lv;
    setLevel(lv);
    await saveLevel(lv);
    setStatus('loading');
    setPastExpanded(false);
    await Promise.all([fetchQuestion(), fetchPastQuestions()]);
  }, [fetchQuestion, fetchPastQuestions]);

  // getAnonymousKey + 저장된 레벨 로드 → 데이터 fetch
  useEffect(() => {
    const init = async () => {
      await ensureUserKey();
      const saved = await loadLevel();
      if (saved) {
        levelRef.current = saved;
        setLevel(saved);
        await Promise.all([fetchQuestion(), fetchPastQuestions()]);
      } else {
        setStatus('ready'); // 레벨 미선택 → LevelSelect 화면
      }
    };
    init();

    const tick = setInterval(() => {
      setPhase(prev => {
        const next = calcPhase();
        return prev !== next ? next : prev;
      });
    }, 30_000);

    return () => clearInterval(tick);
  }, [fetchQuestion, fetchPastQuestions]);

  useEffect(() => {
    if (level && (phase === 'answer' || phase === 'review')) fetchAnswers();
  }, [phase, level, fetchAnswers]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const res  = await fetch(`${API_BASE}/api/answer`, {
        method: 'POST',
        headers: userHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content: content.trim(), level: levelRef.current }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMyAnswer(content.trim());
      setSubmitted(true);
      fetchAnswers();
    } catch (e) {
      setSubmitError(e.message || '제출에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  const streak = useMemo(
    () => calcStreak(pastQuestions, !!(submitted || myAnswer)),
    [pastQuestions, submitted, myAnswer]
  );

  async function handleRetry() {
    await ensureUserKey();
    await Promise.all([fetchQuestion(), fetchPastQuestions()]);
  }

  // ── 렌더 ─────────────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="app">
        <div className="center-state"><div className="spinner" /></div>
      </div>
    );
  }

  // 레벨 미선택 → 온보딩 화면
  if (!level) {
    return <LevelSelect onSelect={selectLevel} />;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-name">TURTLE</span>
          <span className="brand-sub">기획자의 감각훈련소</span>
        </div>
        <div className="header-right">
          {streak >= 2 && <span className="streak-badge">{streak}일 연속</span>}
          <button
            className={`level-badge level-${level}`}
            onClick={() => selectLevel(level === 'junior' ? 'senior' : 'junior')}
          >
            {level === 'junior' ? '주니어' : '시니어'}
          </button>
          <span className={`phase-badge phase-${phase}`}>{PHASE_LABEL[phase]}</span>
        </div>
      </header>

      <LiveClock />

      <main className="main">
        {status === 'loading' ? (
          <div className="center-state"><div className="spinner" /></div>
        ) : status === 'error' ? (
          <div className="center-state">
            <div className="error-icon">!</div>
            <p className="error-msg">{errorMsg}</p>
            <button className="retry-btn" onClick={handleRetry}>다시 시도</button>
          </div>
        ) : (
          <>
            <section className="question-block">
              <p className="question-meta">오늘의 질문</p>
              <h1 className="question-text">{question}</h1>
              <GlossaryHints text={question} />
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
                onEdit={() => { setSubmitted(false); setSubmitError(''); }}
                answerCount={answerCount}
                streak={streak}
                submitError={submitError}
              />
            )}
            {phase === 'review'  && (
              <ReviewPhase myAnswer={myAnswer} answers={answers} />
            )}

            <PhaseGuide currentPhase={phase} />

            {pastQuestions.length > 0 && (
              <PastQuestions
                questions={pastExpanded ? pastQuestions : pastQuestions.slice(0, PAST_LIMIT)}
                total={pastQuestions.length}
                expanded={pastExpanded}
                onExpand={() => setPastExpanded(true)}
              />
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <p>매일 하나의 질문. 기획자의 감각을 훈련합니다.</p>
      </footer>
    </div>
  );
}

// ── 용어 힌트 컴포넌트 ───────────────────────────────────────────────────────

function GlossaryHints({ text }) {
  const hints = useMemo(() => getGlossaryHints(text), [text]);
  if (hints.length === 0) return null;
  return (
    <ul className="glossary-hints">
      {hints.map(h => (
        <li key={h.term} className="glossary-item">
          <span className="glossary-term">* {h.term}</span>
          <span className="glossary-def">{h.def}</span>
        </li>
      ))}
    </ul>
  );
}

// ── 페이즈별 컴포넌트 ─────────────────────────────────────────────────────────

function PreviewPhase() {
  return (
    <section className="phase-block">
      <div className="preview-card">
        <p className="preview-title">답변은 오전 9시부터 제출할 수 있어요.</p>
        <p className="preview-sub">지금은 천천히 질문을 생각하며 답변을 정리해 보세요.</p>
      </div>
    </section>
  );
}

function AnswerPhase({ submitted, myAnswer, content, setContent, maxChars, submitting, onSubmit, onEdit, answerCount, streak, submitError }) {
  const countdown = useCountdownToHour(21);
  const charCount = content.length;

  if (submitted) {
    return (
      <section className="phase-block">
        <div className="submitted-card">
          <div className="check-icon">✓</div>
          {streak >= 1 && (
            <p className="streak-label">
              {streak === 1 ? '오늘 첫 훈련 완료!' : `${streak}일 연속 훈련 중`}
            </p>
          )}
          <p className="submitted-title">오늘의 답변이 제출되었습니다.</p>
          <p className="submitted-notice">오후 9시 전까지 언제든 수정할 수 있어요.</p>
          <div className="answer-box">
            <p className="answer-box-label">내 답변</p>
            <p className="answer-box-text">{myAnswer}</p>
          </div>
          <button className="edit-btn" onClick={onEdit}>수정하기</button>
          {answerCount !== null && (
            <p className="submitted-participants">
              오늘 <span className="participants-count">{answerCount}명</span>이 답변했습니다.
            </p>
          )}
          {countdown ? (
            <p className="submitted-sub">
              리뷰 시작까지&nbsp;
              <span className="submitted-countdown">{countdown}</span>
              &nbsp;남았습니다.
            </p>
          ) : (
            <p className="submitted-sub">오후 9시 이후부터 자정까지 다른 기획자의 답변을 확인할 수 있어요.</p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="phase-block">
      {countdown && (
        <div className="deadline-bar">
          <span className="deadline-label">마감까지</span>
          <span className="deadline-time">{countdown}</span>
          {answerCount !== null && (
            <span className="deadline-participants">{answerCount}명 참여 중</span>
          )}
        </div>
      )}
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
          {submitting ? '제출 중…' : myAnswer ? '수정 완료' : '제출하기'}
        </button>
        {submitError && <p className="submit-error">{submitError}</p>}
        <p className="answer-notice">오후 9시까지 자유롭게 수정할 수 있습니다.</p>
      </form>
    </section>
  );
}

function ReviewPhase({ myAnswer, answers }) {
  const countdown = useCountdownToHour(24);

  return (
    <section className="phase-block">
      {countdown && (
        <div className="deadline-bar deadline-review">
          <span className="deadline-label">리뷰 종료까지</span>
          <span className="deadline-time">{countdown}</span>
        </div>
      )}
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
            <li key={a.id} className="answer-item" style={{ animationDelay: `${i * 45}ms` }}>
              <span className="answer-index">{i + 1}</span>
              <p className="answer-content">{a.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── 레벨 선택 (온보딩) ────────────────────────────────────────────────────────

function LevelSelect({ onSelect }) {
  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-name">TURTLE</span>
          <span className="brand-sub">기획자의 감각훈련소</span>
        </div>
      </header>
      <main className="main">
        <section className="level-select">
          <h2 className="level-select-title">나는 어떤 기획자인가요?</h2>
          <p className="level-select-sub">선택한 레벨에 맞는 질문이 매일 제공됩니다.<br />언제든지 변경할 수 있어요.</p>
          <div className="level-cards">
            <button className="level-card level-card-junior" onClick={() => onSelect('junior')}>
              <span className="level-card-icon">🌱</span>
              <span className="level-card-name">주니어</span>
              <span className="level-card-desc">기획을 시작하거나<br />경력 3년 미만</span>
            </button>
            <button className="level-card level-card-senior" onClick={() => onSelect('senior')}>
              <span className="level-card-icon">🚀</span>
              <span className="level-card-name">시니어</span>
              <span className="level-card-desc">실전 경험이 풍부하거나<br />경력 3년 이상</span>
            </button>
          </div>
        </section>
      </main>
      <footer className="footer">
        <p>매일 하나의 질문. 기획자의 감각을 훈련합니다.</p>
      </footer>
    </div>
  );
}

// ── 지난 훈련 기록 ────────────────────────────────────────────────────────────

function PastQuestions({ questions, total, expanded, onExpand }) {
  return (
    <section className="past-section">
      <div className="past-header">
        <span className="past-title">지난 훈련 기록</span>
        <span className="past-total">{total}개</span>
      </div>
      <ul className="past-list">
        {questions.map(q => (
          <li key={q.date} className="past-item">
            <div className="past-item-top">
              <span className="past-date">{formatKSTDate(q.date)}</span>
              {q.answerCount > 0 && (
                <span className="past-answer-count">{q.answerCount}개의 답변</span>
              )}
            </div>
            <p className="past-question">{q.question}</p>
            {q.myAnswer && (
              <div className="past-my-answer">
                <span className="past-my-label">내 답변</span>
                <p className="past-my-text">{q.myAnswer}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
      {!expanded && total > questions.length && (
        <button className="more-btn" onClick={onExpand}>
          이전 기록 더 보기 ({total - questions.length}개)
        </button>
      )}
    </section>
  );
}
