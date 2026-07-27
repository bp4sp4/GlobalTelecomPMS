import { PrismaClient, type SchoolLevel, type CodeKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();
const DATA = join(process.cwd(), "docs", "01-analysis", "data");

type SchoolSeed = {
  name: string;
  schoolLevel: SchoolLevel;
  kind?: string;
  educationOffice?: string | null;
  district?: string | null;
  address?: string | null;
  foundation?: string | null;
  neisCode?: string | null;
};

type Codebook = {
  equipment: Record<string, { code: string; name: string }[]>;
  fault: Record<string, { code: string; name: string }[]>;
  action: Record<string, { code: string; name: string }[]>;
};

async function seedUsers() {
  const users = [
    { username: "admin", password: "admin1234", role: "ADMIN" as const, name: "운영자" },
    { username: "guest", password: "guest1234", role: "GUEST" as const, name: "게스트" },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        password: await bcrypt.hash(u.password, 10),
        role: u.role,
        name: u.name,
      },
    });
  }
  console.log(`users: ${users.length} (admin/admin1234, guest/guest1234)`);
}

async function seedSchools() {
  const schools = JSON.parse(
    readFileSync(join(DATA, "schools.seed.json"), "utf8")
  ) as SchoolSeed[];
  // 대량 삽입 (중복 무시)
  const result = await prisma.school.createMany({
    data: schools.map((s) => ({
      name: s.name,
      schoolLevel: s.schoolLevel,
      kind: s.kind ?? null,
      educationOffice: s.educationOffice ?? null,
      district: s.district ?? null,
      address: s.address ?? null,
      foundation: s.foundation ?? null,
      neisCode: s.neisCode ?? null,
    })),
    skipDuplicates: true,
  });
  console.log(`schools: ${result.count} inserted`);
}

async function seedCodes() {
  const cb = JSON.parse(
    readFileSync(join(DATA, "codebook.json"), "utf8")
  ) as Codebook;
  const rows: { code: string; kind: CodeKind; category: string; name: string }[] = [];
  const push = (kind: CodeKind, groups: Codebook["equipment"]) => {
    for (const [category, items] of Object.entries(groups)) {
      for (const it of items) {
        if (it.code) rows.push({ code: it.code, kind, category, name: it.name ?? "" });
      }
    }
  };
  push("EQUIPMENT", cb.equipment);
  push("FAULT", cb.fault);
  push("ACTION", cb.action);
  const result = await prisma.code.createMany({ data: rows, skipDuplicates: true });
  console.log(`codes: ${result.count} inserted (of ${rows.length})`);
}

async function seedEquipmentCatalog() {
  const path = join(DATA, "equipment-catalog.seed.json");
  let items: { name: string; code: string; maker: string }[] = [];
  try {
    items = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    console.log("equipment-catalog: seed file 없음, 건너뜀");
    return;
  }
  const existing = await prisma.equipmentCatalog.count();
  if (existing > 0) {
    console.log(`equipment-catalog: 이미 ${existing}건 존재, 건너뜀`);
    return;
  }
  const rows = items
    .filter((x) => x.name)
    .map((x) => ({ name: x.name ?? "", code: x.code ?? "", maker: x.maker ?? "" }));
  const result = await prisma.equipmentCatalog.createMany({ data: rows });
  console.log(`equipment-catalog: ${result.count} inserted`);
}

async function seedMessages() {
  const admin = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!admin) return;
  const count = await prisma.message.count();
  if (count > 0) return;
  await prisma.message.createMany({
    data: [
      { authorId: admin.id, content: "운영자입니다 사진 업로드 후 수정이 불가 합니다 사전에 미리 정리 하셔서 업로드 부탁 드립니다." },
      { authorId: admin.id, content: "보고서 작성 중 개선 사항에 내용이 없으면 적지 말고 이상 없음 작성 하지 마세요! *내용 적으면 개선 통계 수치에 포함 됩니다*" },
      { authorId: admin.id, content: "컨설팅 보고서 완료 처리 시 신중하게 마지막 까지 확인 하시고 완료 처리 부탁 드립니다 완료 처리 후에는 수정 하지 마세요 통계 수치가 변경 될수 있습니다." },
    ],
  });
  console.log("messages: 3 inserted");
}

async function main() {
  await seedUsers();
  await seedSchools();
  await seedCodes();
  await seedEquipmentCatalog();
  await seedMessages();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
