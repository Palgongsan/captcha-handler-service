# Camping Watcher

그린웨이가족캠핑장 xTicket 예약 취소분을 감시하고, 예약 가능한 자리가 생기면 Telegram으로 알리는 앱입니다.

현재 권장 구조는 Supabase 방식입니다.

```text
Vercel / Next.js 대시보드
        |
        v
Supabase Postgres: 감시 목록, Telegram chat_id, 마지막 상태 저장
        |
        v
Supabase Cron: 1분마다 Edge Function 호출
        |
        v
Supabase Edge Function: xTicket 조회 후 Telegram 알림
```

기존 Python FastAPI 앱은 `app/` 폴더에 남아 있지만, 온라인 상시 감시는 `web/` + `supabase/` 구조를 사용하세요.

## 폴더 구조

- `web/`: Vercel에 배포할 Next.js 대시보드
- `supabase/migrations/`: Supabase Postgres 테이블 생성 SQL
- `supabase/functions/check-watches/`: 1분 감시 Edge Function
- `supabase/sql/schedule_check_watches.sql`: Supabase Cron 등록 SQL
- `DESIGN-vercel.md`: UI 디자인 시스템 기준 문서

## 필요한 환경변수

Vercel `web/` 프로젝트와 Supabase Edge Function에 같은 핵심 값을 설정합니다.

```text
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_EDGE_FUNCTION_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-watches
SUPABASE_EDGE_FUNCTION_SECRET=긴_랜덤_문자열
XTICKET_SHOP_ENCODE=5f9422e223671b122a7f2c94f4e15c6f71cd1a49141314cf19adccb98162b5b0
TELEGRAM_BOT_TOKEN=BotFather가_준_토큰
ADMIN_PASSWORD=관리자_비밀번호
SECRET_KEY=긴_랜덤_문자열
TIMEZONE=Asia/Seoul
```

`SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `SECRET_KEY`, `SUPABASE_EDGE_FUNCTION_SECRET`는 브라우저에 노출하면 안 됩니다.

## Supabase 설정

1. Supabase 프로젝트를 만듭니다.
2. Supabase CLI를 로그인/연결합니다.

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

3. DB 마이그레이션을 적용합니다.

```powershell
npx supabase db push
```

4. Edge Function secret을 설정합니다.

```powershell
npx supabase secrets set `
  SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co" `
  SUPABASE_SERVICE_ROLE_KEY="..." `
  SUPABASE_EDGE_FUNCTION_SECRET="긴_랜덤_문자열" `
  XTICKET_SHOP_ENCODE="5f9422e223671b122a7f2c94f4e15c6f71cd1a49141314cf19adccb98162b5b0" `
  TELEGRAM_BOT_TOKEN="BotFather가_준_토큰"
```

5. Edge Function을 배포합니다.

```powershell
npx supabase functions deploy check-watches
```

6. Supabase SQL Editor에서 `supabase/sql/schedule_check_watches.sql`을 열고 placeholder를 바꾼 뒤 실행합니다.

```text
https://YOUR_PROJECT_REF.supabase.co
YOUR_SUPABASE_EDGE_FUNCTION_SECRET
```

이 Cron은 매분 `check-watches` Edge Function을 호출합니다.

## Vercel / Next.js 대시보드

로컬 실행:

```powershell
cd web
npm install
npm run dev
```

로컬에서 Supabase 없이 UI와 xTicket 조회를 테스트하려면 `web/.env.local`의 `LOCAL_DEMO_MODE=1`을 사용합니다. 이 경우 감시 목록은 `web/.local/app.json`에 저장됩니다.

배포:

1. Vercel에서 `web/` 폴더를 프로젝트 루트로 설정합니다.
2. `web/.env.example`의 환경변수를 Vercel Environment Variables에 등록합니다.
3. 배포 후 `/telegram` 화면에서 chat_id를 저장하고 테스트 메시지를 보냅니다.

## Telegram 설정

1. Telegram에서 `@BotFather`를 엽니다.
2. `/newbot`으로 봇을 만들고 token을 받습니다.
3. token을 `TELEGRAM_BOT_TOKEN` 환경변수에 저장합니다.
4. 만든 봇에게 `/start`를 보냅니다.
5. 대시보드 `/telegram` 화면에서 `최근 chat_id 찾기`를 누릅니다.
6. `테스트 메시지`로 연결을 확인합니다.

## 로컬 검증

```powershell
cd web
npm run typecheck
npm run build
```

Supabase 환경변수가 없으면 대시보드 런타임 DB 호출은 실패하지만, 타입 체크와 빌드는 검증할 수 있습니다.

## 동작 정책

- `status_code == "0"` 그리고 `select_yn == "1"`이면 예약 가능으로 판정합니다.
- 감시 생성 직후 즉시 확인합니다.
- 이미 가능한 자리는 최초 1회 알림을 보냅니다.
- 이후에는 불가 상태에서 가능 상태로 바뀔 때만 다시 알립니다.
- 자동 예약, CAPTCHA 우회, 로그인 예약 자동화는 포함하지 않습니다.
