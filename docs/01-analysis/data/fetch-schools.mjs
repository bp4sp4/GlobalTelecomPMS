// NEIS 학교기본정보 → 서울 전체 학교 시드 생성 (인증키 사용)
// 구(區) → 교육지원청 매핑으로 지청 도출 (원본 /api/school-info 와 일치 검증됨)
import fs from "node:fs";

const KEY = process.env.NEIS_KEY;

const GU_TO_OFFICE = {
  "동대문구": "동부", "중랑구": "동부",
  "은평구": "서부", "마포구": "서부", "서대문구": "서부",
  "영등포구": "남부", "구로구": "남부", "금천구": "남부",
  "노원구": "북부", "도봉구": "북부",
  "종로구": "중부", "중구": "중부", "용산구": "중부",
  "강동구": "강동송파", "송파구": "강동송파",
  "강서구": "강서양천", "양천구": "강서양천",
  "강남구": "강남서초", "서초구": "강남서초",
  "동작구": "동작관악", "관악구": "동작관악",
  "성동구": "성동광진", "광진구": "성동광진",
  "성북구": "성북강북", "강북구": "성북강북",
};

const LEVEL = (knd) => {
  if (!knd) return "ETC";
  if (knd.includes("초등")) return "ELEMENTARY";
  if (knd.includes("중학")) return "MIDDLE";
  if (knd.includes("고등")) return "HIGH";
  return "ETC";
};

const guFrom = (addr) => {
  const m = (addr || "").match(/서울특별시\s+(\S+?구)/);
  return m ? m[1] : null;
};

async function fetchPage(pIndex, pSize) {
  const url = `https://open.neis.go.kr/hub/schoolInfo?KEY=${KEY}&Type=json&pIndex=${pIndex}&pSize=${pSize}&ATPT_OFCDC_SC_CODE=B10`;
  const res = await fetch(url);
  const json = await res.json();
  const block = json.schoolInfo;
  if (!block) return { total: 0, rows: [], raw: JSON.stringify(json).slice(0, 200) };
  const total = block[0].head[0].list_total_count;
  const rows = block[1].row;
  return { total, rows };
}

const all = [];
let pIndex = 1;
const pSize = 1000;
let total = Infinity;
while (all.length < total) {
  const { total: t, rows, raw } = await fetchPage(pIndex, pSize);
  if (raw) { console.error("응답 이상:", raw); break; }
  total = t;
  all.push(...rows);
  if (!rows.length) break;
  pIndex++;
  if (pIndex > 10) break;
}

const schools = all.map((r) => {
  const gu = guFrom(r.ORG_RDNMA);
  return {
    name: r.SCHUL_NM,
    schoolLevel: LEVEL(r.SCHUL_KND_SC_NM),
    kind: r.SCHUL_KND_SC_NM,
    educationOffice: gu ? GU_TO_OFFICE[gu] ?? null : null,
    district: gu,
    address: (r.ORG_RDNMA || "").trim(),
    foundation: r.FOND_SC_NM,
    neisCode: r.SD_SCHUL_CODE,
  };
});

const byOffice = {};
const byLevel = {};
let noOffice = 0;
const unmappedGu = new Set();
for (const s of schools) {
  byLevel[s.schoolLevel] = (byLevel[s.schoolLevel] || 0) + 1;
  if (!s.educationOffice) { noOffice++; if (s.district) unmappedGu.add(s.district); }
  else byOffice[s.educationOffice] = (byOffice[s.educationOffice] || 0) + 1;
}

fs.writeFileSync(
  "C:/Users/bp4sp/Downloads/port/CRM/docs/01-analysis/data/schools.seed.json",
  JSON.stringify(schools, null, 2)
);

console.log("총 학교:", schools.length, "/ NEIS total:", total);
console.log("학교급:", byLevel);
console.log("지청 미매핑:", noOffice, [...unmappedGu]);
console.log("지청별:", byOffice);
