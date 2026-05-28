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

// 앱인토스 미니앱: x-user-key(getAnonymousKey 해시)를 우선 사용, 없으면 IP 폴백
function getUserId(req) {
  const key = req.headers['x-user-key'];
  if (key && typeof key === 'string' && key.length > 0) return key;
  return getClientIP(req);
}

// Toss 미니앱 WebView + 기존 Vercel 웹 모두 허용
// 쿠키 미사용, x-user-key 커스텀 헤더 기반 인증이므로 * 허용 안전
function setCORSHeaders(req, res, methods = 'GET, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-key');
}

module.exports = { getKSTDateStr, getKSTHour, getPhase, secondsUntilMidnightKST, getClientIP, getUserId, setCORSHeaders };
