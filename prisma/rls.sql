-- =============================================================
-- Row Level Security (RLS) 보안 설정
-- 실행: prisma db push 이후 1회.
--   node --env-file=.env -e "..." 또는 아래를 DIRECT_URL로 실행.
--   npx prisma db execute --file prisma/rls.sql --schema prisma/schema.prisma
--
-- 원리: 앱은 Prisma(=postgres 소유자 role)로만 DB에 접근하므로 RLS를 우회한다.
--       반면 Supabase가 public 스키마 테이블을 PostgREST로 자동 노출하고
--       클라이언트에 공개된 anon 키로 조회가 가능한데(특히 User.password 해시!),
--       RLS 활성화(정책 없음 = 전면 거부) + anon/authenticated 권한 회수로 차단한다.
-- =============================================================

ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."School" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Code" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AccessLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ActivityLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."EquipmentCatalog" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "public"."User" FROM anon, authenticated;
REVOKE ALL ON "public"."School" FROM anon, authenticated;
REVOKE ALL ON "public"."Report" FROM anon, authenticated;
REVOKE ALL ON "public"."Code" FROM anon, authenticated;
REVOKE ALL ON "public"."Message" FROM anon, authenticated;
REVOKE ALL ON "public"."AccessLog" FROM anon, authenticated;
REVOKE ALL ON "public"."ActivityLog" FROM anon, authenticated;
REVOKE ALL ON "public"."EquipmentCatalog" FROM anon, authenticated;

-- 참고: 향후 supabase-js(anon 키)로 특정 테이블을 직접 읽어야 하면
--       해당 테이블에 GRANT + CREATE POLICY 로 최소 권한만 부여할 것.
