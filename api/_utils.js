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

// 자정(KST)까지 남은 초
function secondsUntilMidnightKST() {
  const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const end = new Date(kst);
  end.setHours(24, 0, 0, 0);
  return Math.ceil((end - kst) / 1000);
}

// Vercel이 설정한 x-real-ip를 우선 사용 (x-forwarded-for는 클라이언트가 조작 가능)
function getClientIP(req) {
  return (
    req.headers['x-real-ip'] ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    'unknown'
  );
}

module.exports = { getKSTDateStr, getKSTHour, getPhase, secondsUntilMidnightKST, getClientIP };
