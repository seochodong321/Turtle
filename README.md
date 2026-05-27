# 기획자의 감각훈련소, 터틀

매일 하나의 질문. 거북이처럼 느리지만 꾸준하게.

**→ [turtle-ecru.vercel.app](https://turtle-ecru.vercel.app)**

## 구조

```
api/          Vercel 서버리스 함수
  _utils.js   KST 시간·페이즈 공통 헬퍼
  answer.js           POST /api/answer
  answers/today.js    GET  /api/answers/today
  question/today.js   GET  /api/question/today
  questions/past.js   GET  /api/questions/past

data/
  questions.json  2026년 말까지 질문 목록

frontend/     React + Vite
```

## 페이즈 (KST 기준)

| 시간 | 페이즈 |
|---|---|
| 00:00 – 09:00 | 준비 중 — 질문 읽기 |
| 09:00 – 21:00 | 답변 시간 — 제출·수정 가능 |
| 21:00 – 24:00 | 리뷰 시간 — 모든 답변 공개 |

## 로컬 실행

```bash
cd frontend && npm install && npm run dev  # 프론트엔드
vercel dev                                  # API (Vercel CLI 필요)
```

환경변수:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
