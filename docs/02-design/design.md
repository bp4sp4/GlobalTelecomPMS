# 설계 문서 — 방송장비 컨설팅 문서자동화 시스템 (클론)

> 원본: `http://123.215.15.150:8000` (FastAPI 기반)
> 클론 목표: 동일 기능 풀스택 재구현
> 관련 문서: [기능 분석](../01-analysis/system-analysis.md) · [코드북](../01-analysis/data/codebook.json)

## 1. 기술 스택 (확정)

| 영역 | 선택 | 비고 |
|------|------|------|
| 프레임워크 | **Next.js (App Router)** | 프론트+API 라우트+SSR 통합 |
| 언어 | **TypeScript** | |
| 스타일 | **KRDS 디자인 토큰 + CSS Modules** | ⚠️ Tailwind 미사용. `globals.css`에 `--krds-*` 전역 토큰, 페이지/컴포넌트별 `*.module.css` |
| 디자인 시스템 | **KRDS** (Government Blue `#256EF4`, Pretendard GOV) | 공공기관 톤. [krds-tokens.css](krds-tokens.css) |
| ORM | **Prisma** | |
| DB | **PostgreSQL** | 로컬 개발은 Docker 또는 Supabase |
| 인증 | **아이디/비밀번호 (세션 기반)** | 소셜로그인 제외. bcrypt 해시 + httpOnly 쿠키 |
| PDF/CSV | 서버 생성(예: `@react-pdf` 또는 puppeteer) + CSV 유틸 | 원본의 PDF/CSV 출력 대응 |

## 2. 스타일링 아키텍처 (KRDS + CSS Modules)

```
src/
  app/
    globals.css              # @import krds-tokens; 전역 리셋 + 폰트
    layout.tsx
    (auth)/login/
      page.tsx
      page.module.css        # 로그인 화면 전용 스타일
    dashboard/
      page.tsx
      page.module.css
    ...
  styles/
    krds-tokens.css          # --krds-* CSS 변수 (docs/02-design/krds-tokens.css 복사)
  components/
    ui/
      Button/Button.tsx + Button.module.css
      Input/Input.tsx  + Input.module.css
      Select/Select.tsx + Select.module.css
      Badge/Badge.tsx  + Badge.module.css
      Card/Card.tsx    + Card.module.css
      Modal/Modal.tsx  + Modal.module.css
      Table/Table.module.css
```

**규칙**
- 색·간격·라운드·폰트는 항상 `var(--krds-*)` 토큰 참조 (하드코딩 hex 금지)
- 클래스명은 CSS Modules 로컬 스코프 (`styles.card`, `styles.primaryBtn`)
- 전역은 토큰 정의 + `body` 기본 + focus ring만. 나머지는 전부 모듈
- Pretendard GOV 웹폰트는 `public/fonts`에 두고 `@font-face` 또는 next/font local

**KRDS 핵심 토큰 (요약)**
- Primary 액션 `#256EF4` / pressed `#083891` / hover `#0b50d0` / 약배경 `#ecf2fe`
- 본문 `#1e2124` 17px·400 / line-height 1.5 / 보조 `#464c53` / caption `#6d7882`
- 보더 강 `#58616a` / 약 `#b1b8be` / disabled 표면 `#cdd1d5`
- 시스템색 danger `#de3412` · success `#228738` · warning `#ffb114` · info `#0b78cb`
- 컴포넌트 높이 5단계 32/40/48/56/64 · 라운드 4/6/8/12/max · focus ring 4px halo

## 3. 데이터 모델 (Prisma 스키마 초안)

원본은 `reports` 테이블 + `schools.json` 기반. 복잡한 중첩 폼은 JSON 페이로드로, 통계 집계에 필요한 필드는 정규화 컬럼으로 분리.

```prisma
// 사용자
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  password  String                       // bcrypt hash
  name      String?
  role      Role     @default(GUEST)
  createdAt DateTime @default(now())
  reports   Report[]
  messages  Message[]
}
enum Role { ADMIN GUEST }

// 학교 마스터 (schools.json → DB)
model School {
  id             String  @id @default(cuid())
  name           String  @unique          // 학교명
  educationOffice String                   // 교육지원청(11개 지청)
  schoolLevel    SchoolLevel               // 초/중/고/기타
  district       String?                   // 소재지(구)
  address        String?                   // 주소
  isSuneungVenue Boolean @default(false)   // 수능시험장 여부
  reports        Report[]
  @@index([educationOffice])
  @@index([name])
}
enum SchoolLevel { ELEMENTARY MIDDLE HIGH ETC }

// 통합 보고서
model Report {
  id          String       @id @default(cuid())
  school      School       @relation(fields: [schoolId], references: [id])
  schoolId    String
  type        ReportType
  round       Int?                         // 컨설팅 1차/2차
  status      ReportStatus @default(DRAFT)
  payload     Json                         // 폼 상세(섹션/행 데이터)
  createdBy   User?        @relation(fields: [createdById], references: [id])
  createdById String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  completedAt DateTime?
  @@index([schoolId, type, status])
}
enum ReportType { CONSULTING EQUIPMENT SPEAKERLINE IMPROVEMENT PHOTOS }
enum ReportStatus { DRAFT DONE }

// 코드북 (장비/장애/조치)
model Code {
  id       String   @id @default(cuid())
  code     String   @unique                // PA-001, F-AUD-001, A-VID-001
  kind     CodeKind                         // EQUIPMENT / FAULT / ACTION
  category String                           // PA/AU/VI/ETC 또는 AUD/VID/PWR...
  name     String
  @@index([kind, category])
}
enum CodeKind { EQUIPMENT FAULT ACTION }

// 대시보드 공지 메시지
model Message {
  id        String   @id @default(cuid())
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  content   String   @db.Text
  createdAt DateTime @default(now())
}

// (선택) 접속 로그 — admin 원격접속 목록
model AccessLog {
  id        String   @id @default(cuid())
  userId    String
  ip        String?
  createdAt DateTime @default(now())
  @@index([createdAt])
}
```

### payload JSON 구조(유형별)
- **EQUIPMENT**: `{ inspectDate, handler, items: [{no,category,name,manufacturer,model,qty,introDate,location,handler,status,replace}] }`
- **SPEAKERLINE**: `{ inspectDate, handler, section1:[4 고정항목 판정/비고], section2:[출력음압 행], section3:[임피던스 행], memo }`
- **IMPROVEMENT**: `{ improveDate, handler, items:[{category,name,manufacturer,model,qty,location,amount,content}], totalAmount, memo }`
- **PHOTOS**: `{ shootDate, handler, memo, category, rooms:{방송실:[fileRefs], 강당체육관:[...], ...} }`
- **CONSULTING**: `{ round, facilities:{방송실:bool,...}, base:{office,school,district,visitDate,maintenance,suneung}, items:[{facility,inspectItem,equipmentCode,faultCode,state,actionDesc,actionCode,field,urgency}] }`

## 4. 라우트 / 페이지 구조

| 경로 | 설명 | 권한 | 원본 대응 |
|------|------|------|-----------|
| `/login` | 로그인 | 공개 | `/` |
| `/dashboard` | 대시보드(KPI/공지/원격접속) | 로그인 | `/dashboard` |
| `/dashboard/stats` | 진척관리(관제) 통계 | 로그인 | `/dashboard/stats` |
| `/docs` | 문서관리(학교검색→5종) | 로그인 | `/docs` |
| `/docs/saved` | 저장(DRAFT) 문서함 | 로그인 | 동일 |
| `/docs/completed` | 완료(DONE) 문서함 | 로그인 | 동일 |
| `/docs/equipment` | 방송 장비 목록 | 로그인 | 동일 |
| `/docs/speakerline` | 스피커 선로 점검 | 로그인 | 동일 |
| `/docs/improvement` | 개선보고서 | 로그인 | 동일 |
| `/docs/photos` | 방송사진 | 로그인 | `/docs/equipment_photos` |
| `/docs/consulting` | 컨설팅 진입 | 로그인 | 동일 |
| `/pms/consulting/new` | 컨설팅 PMS 작성 템플릿 | 로그인 | `/pms/broadcast-consulting/new` |
| `/system/csv` | 학교 데이터 업로드 | **ADMIN** | 동일 |
| `/api/*` | API 라우트(인증/학교검색/보고서 CRUD/통계) | — | FastAPI 대체 |

### API 라우트(초안)
- `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/schools?q=서울` — 초성/부분 검색 자동완성
- `GET /api/schools/:id`
- `GET /api/reports?school=&type=&status=`
- `POST /api/reports` (저장/초안), `PATCH /api/reports/:id` (완료 처리), `DELETE /api/reports/:id`
- `GET /api/codes?kind=EQUIPMENT&q=` — 코드북 검색
- `GET /api/stats?office=` — 관제 통계 집계
- `GET /api/messages`, `POST /api/messages`

## 5. 인증 / 권한

- 세션: httpOnly 쿠키(JWT 또는 서버 세션). 미들웨어에서 `/dashboard`·`/docs`·`/pms` 보호
- 역할: ADMIN(전체) / GUEST(통계 열람·보고서 작성, CSV업로드·접속자목록 제외)
- 미들웨어: 미인증 → `/login` 리다이렉트, GUEST가 admin 경로 접근 → `/dashboard` 리다이렉트 (원본 동작 재현)

## 6. 완료(DONE) 규칙 / 통계 (원본 로직 재현)

- 완료 기준: 컨설팅 DONE=1 / 스피커선로 DONE=4 (대시보드 문구)
- 진행률 = 완료 / 컨설팅대상(300) → 예: 109/300 = 36%
- 완료 후 수정 불가 정책 (통계 수치 확정)
- 통계 집계: 학교(1414) × 지청(11) × 지표(컨설팅DONE/개선/집중진단/노후화/장애)

## 7. 구현 단계 (제안)

1. **프로젝트 스캐폴딩** — Next.js + TS, `globals.css`에 KRDS 토큰, Prisma 초기화, Postgres 연결
2. **KRDS UI 컴포넌트** — Button/Input/Select/Badge/Card/Modal/Table (module.css)
3. **인증** — 로그인 페이지(KRDS 폼) + 세션 미들웨어 + 시드 계정(admin/guest)
4. **학교 마스터 & 코드북 시드** — schools.json(확보 후) + codebook.json 임포트
5. **문서관리 + 5종 보고서** — 학교검색 자동완성 → 폼 → 저장/완료
6. **대시보드 + 관제 통계** — KPI, 지청별 차트/표
7. **저장/완료 문서함 + PDF/CSV 출력**
8. **관리자 기능** — CSV 업로드, 접속자 목록

## 8. 미확보/후속

- **학교 마스터(1414교)**: 원본 `schools.json` 미확보 (브라우저 재연결 후 추출 예정). 우선 스키마+샘플 시드로 진행 가능
- 컨설팅 시청각실/강당 점검항목 상세(캡처 잘림) — 방송실 구조 복제로 초기 구현
- PDF 출력 정확한 레이아웃 — 원본 출력물 확보 시 정밀화
