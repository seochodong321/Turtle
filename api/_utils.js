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

// 자정(KST)까지 남은 초 — rate limit TTL에 사용
function secondsUntilMidnightKST() {
  const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const end = new Date(kst);
  end.setHours(24, 0, 0, 0);
  return Math.ceil((end - kst) / 1000);
}

module.exports = { getKSTDateStr, getKSTHour, getPhase, secondsUntilMidnightKST };
