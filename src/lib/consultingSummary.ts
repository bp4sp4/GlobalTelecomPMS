/**
 * 컨설팅 결과 / 총평 자동정리
 *
 * 점검표의 각 행을 규칙에 따라 문장으로 조립한다.
 * 코드(ETC-004)가 아니라 "내용(명칭)"(U.P.S — 무정전공급장치) 기준으로 정리한다.
 */

export type SummaryRow = {
  item: string; // 점검항목
  equipment: string; // 장비 코드
  fault: string; // 장애 코드
  state: string; // 동작상태
  action: string; // 조치내용(자유 입력)
  actionCode: string; // 조치 코드
  field: string; // 분야(음향/영상/조명/기타)
  urgency: string; // 상/중/하
};

export type CodeMap = Record<string, string>; // code -> name

const URGENCY_EMOJI: Record<string, string> = {
  상: "🔴",
  중: "🟡",
  하: "🟢",
};

const URGENCY_CAPTION: Record<string, string> = {
  상: "[시급성 상 🔴] 우선 대응 필요(즉시 조치/긴급 점검 권고)",
  중: "[시급성 중 🟡] 단기 내 조치 권고(보완/부품 교체/재점검)",
  하: "[시급성 하 🟢] 정기 점검 계획 반영 권고(운영 안정화/예방)",
};

const RECOMMENDATION =
  "권고: 방송/음향/영상 설비의 안정적 운영을 위해 정기 점검 및 주요 취약 지점 개선을 추진하시기 바랍니다.";

/** 시설명 + 분야 → "방송실(음향)" */
function facilityLabel(facility: string, field: string) {
  return field ? `${facility}(${field})` : facility;
}

/** 값이 있는 항목만 " / "로 연결 */
function joinParts(parts: (string | null | undefined)[]) {
  return parts.filter((p) => p && p.trim()).join(" / ");
}

/** 한 행을 문장으로 (시급성 제외) */
function rowBody(
  facility: string,
  r: SummaryRow,
  maps: { equip: CodeMap; fault: CodeMap; action: CodeMap },
  opts: { withLabels: boolean }
) {
  const equipName = r.equipment ? maps.equip[r.equipment] ?? r.equipment : "";
  const faultName = r.fault ? maps.fault[r.fault] ?? r.fault : "";
  const actionName = r.actionCode ? maps.action[r.actionCode] ?? r.actionCode : "";
  const L = opts.withLabels;

  return joinParts([
    facilityLabel(facility, r.field),
    r.item ? (L ? `점검항목:${r.item}` : r.item) : "",
    equipName ? (L ? `관련장비:${equipName}` : equipName) : "",
    r.state ? `동작상태:${r.state}` : "",
    faultName ? `장애:${faultName}` : "",
    r.action ? `조치내용:${r.action}` : "",
    actionName ? `조치:${actionName}` : "",
  ]);
}

/** 내용이 하나라도 있는 행만 대상 */
function hasContent(r: SummaryRow) {
  return Boolean(
    r.item?.trim() ||
      r.equipment ||
      r.fault ||
      r.state?.trim() ||
      r.action?.trim() ||
      r.actionCode
  );
}

function flatten(
  sections: Record<string, SummaryRow[]>,
  facilityOrder: string[]
): { facility: string; row: SummaryRow }[] {
  const out: { facility: string; row: SummaryRow }[] = [];
  for (const facility of facilityOrder) {
    for (const row of sections[facility] ?? []) {
      if (hasContent(row)) out.push({ facility, row });
    }
  }
  return out;
}

/** 컨설팅 결과: 번호 매긴 전체 목록 */
export function buildConsultingResult(
  sections: Record<string, SummaryRow[]>,
  facilityOrder: string[],
  maps: { equip: CodeMap; fault: CodeMap; action: CodeMap }
): string {
  const rows = flatten(sections, facilityOrder);
  return rows
    .map(({ facility, row }, i) => {
      const body = rowBody(facility, row, maps, { withLabels: true });
      const u = row.urgency
        ? `시급성 ${row.urgency} ${URGENCY_EMOJI[row.urgency] ?? ""}`.trim()
        : "";
      return `${i + 1}. ${joinParts([body, u])}`;
    })
    .join("\n");
}

/** 개선사항: 점검항목에 '개선'이 포함된 행만 별도 정리 */
export function buildImprovement(
  sections: Record<string, SummaryRow[]>,
  facilityOrder: string[],
  maps: { equip: CodeMap; fault: CodeMap; action: CodeMap }
): string {
  const rows = flatten(sections, facilityOrder).filter(({ row }) =>
    row.item?.includes("개선")
  );
  return rows
    .map(({ facility, row }) => `- ${rowBody(facility, row, maps, { withLabels: true })}`)
    .join("\n");
}

/** 총평: 건수 집계 + 시급성별 그룹 */
export function buildSummary(
  sections: Record<string, SummaryRow[]>,
  facilityOrder: string[],
  maps: { equip: CodeMap; fault: CodeMap; action: CodeMap }
): string {
  const rows = flatten(sections, facilityOrder);
  const total = rows.length;
  const count = (u: string) => rows.filter(({ row }) => row.urgency === u).length;

  const lines: string[] = [
    `- 총${total}건 시급성 상 ${count("상")} 🔴/ 중 ${count("중")} 🟡/ 하 ${count("하")} 🟢`,
  ];

  for (const u of ["상", "중", "하"]) {
    const group = rows.filter(({ row }) => row.urgency === u);
    if (!group.length) continue;
    lines.push("", URGENCY_CAPTION[u]);
    for (const { facility, row } of group) {
      lines.push(`- ${rowBody(facility, row, maps, { withLabels: false })}`);
    }
  }

  lines.push("", RECOMMENDATION);
  return lines.join("\n");
}
