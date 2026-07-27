# GlobalTelecom PMS — 방송장비 컨설팅 문서자동화 시스템

학교별 방송·음향 장비 점검 및 컨설팅 보고서 관리 시스템.

## 기술 스택

- **Next.js 15** (App Router) + TypeScript
- **스타일**: Toss(TDS) 스타일 디자인 토큰 + CSS Modules (Tailwind 미사용), Pretendard
- **DB/인증/스토리지**: Supabase (PostgreSQL) + Prisma ORM
- **인증**: 아이디/비밀번호 세션(JWT httpOnly 쿠키, bcrypt)

## 주요 기능

- 대시보드(KPI/공지/원격접속) · 관제(통계)
- 문서 작성: 학교 검색 → 보고서 5종
  - 방송장비 컨설팅(1·2차, PMS 템플릿, 코드북·전자서명)
  - 방송 장비 목록(장비 카탈로그 검색 자동완성)
  - 스피커 선로 점검 · 개선보고서 · 방송사진(Supabase Storage)
- 저장/완료 문서함, PDF/CSV 출력

## 로컬 개발

```bash
npm install
cp .env.example .env   # 값 채우기 (아래 참고)
npx prisma db push     # 스키마 반영
npx prisma db seed     # 초기 데이터(학교/코드북/장비카탈로그/계정)
# 보안: 최초 1회 RLS 적용
#   node --env-file=.env -e "..."  또는  prisma/rls.sql 실행
npm run dev
```

기본 계정: `admin / admin1234`, `guest / guest1234`

## 환경변수 (.env)

| 키 | 설명 |
|----|------|
| `DATABASE_URL` | Supabase Postgres (pooled, 6543) |
| `DIRECT_URL` | Supabase Postgres (direct/session, 5432) — 마이그레이션용 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon(publishable) 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role(secret) 키 — 서버 전용 |
| `AUTH_SECRET` | 세션 서명 시크릿(랜덤 문자열) |

## 배포 (Vercel)

1. 이 저장소를 Vercel에 Import
2. 위 환경변수를 Vercel 프로젝트 설정에 등록
3. Build: `prisma generate && next build` (기본 설정)
4. 최초 배포 후 DB에 `prisma db push` + `db seed` + RLS 적용 (로컬에서 원격 DB로 1회)

## 보안 (RLS)

Supabase가 public 스키마를 REST로 노출하므로, 전 테이블에 RLS 활성화 +
anon/authenticated 권한을 회수했습니다. 앱은 Prisma(소유자 role)로 접근하여 정상 동작.
새 DB 세팅 시 [`prisma/rls.sql`](prisma/rls.sql) 을 1회 실행하세요.
