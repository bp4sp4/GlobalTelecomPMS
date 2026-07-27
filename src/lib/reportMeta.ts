import type { ReportType } from "@prisma/client";

export const TYPE_META: {
  type: ReportType;
  icon: string;
  title: string;
  path: string; // 편집 경로
}[] = [
  { type: "CONSULTING", icon: "📄", title: "컨설팅 보고서", path: "/docs/consulting" },
  { type: "EQUIPMENT", icon: "🧾", title: "방송 장비 목록", path: "/docs/equipment" },
  { type: "SPEAKERLINE", icon: "🔊", title: "스피커 선로 점검 보고서", path: "/docs/speakerline" },
  { type: "IMPROVEMENT", icon: "🛠", title: "개선보고서", path: "/docs/improvement" },
  { type: "PHOTOS", icon: "📷", title: "방송사진", path: "/docs/photos" },
];

export function metaOf(type: ReportType) {
  return TYPE_META.find((m) => m.type === type)!;
}
