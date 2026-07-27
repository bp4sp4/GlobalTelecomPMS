export type SaveArgs = {
  school: string;
  type: "CONSULTING" | "EQUIPMENT" | "SPEAKERLINE" | "IMPROVEMENT" | "PHOTOS";
  round?: number | null;
  payload: unknown;
  status: "DRAFT" | "DONE";
};

export async function saveReport(args: SaveArgs) {
  const res = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.message ?? "저장 실패");
  }
  return res.json();
}
