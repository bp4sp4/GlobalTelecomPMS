import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity, REPORT_TYPE_LABEL } from "@/lib/activityLog";

// DELETE /api/reports/:id
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  const { id } = await params;

  // 삭제 후에는 대상 정보를 알 수 없으므로 미리 읽어둔다
  const target = await prisma.report
    .findUnique({ where: { id }, include: { school: { select: { name: true } } } })
    .catch(() => null);

  await prisma.report.delete({ where: { id } }).catch(() => null);

  if (target) {
    logActivity({
      session,
      req,
      action: "DELETE",
      entity: "REPORT",
      entityId: id,
      target: `${target.school.name} · ${REPORT_TYPE_LABEL[target.type] ?? target.type}${
        target.round ? ` ${target.round}차` : ""
      }`,
      detail: target.status === "DONE" ? "완료 문서 삭제" : "초안 삭제",
    });
  }

  return NextResponse.json({ ok: true });
}
