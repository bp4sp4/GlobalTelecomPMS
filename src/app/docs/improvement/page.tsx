export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/AppShell";
import { docsNav } from "@/lib/nav";
import { loadReportContext } from "@/lib/reportServer";
import { ImprovementForm } from "./ImprovementForm";
import { NoSchool } from "@/components/report/NoSchool";

export default async function ImprovementPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string }>;
}) {
  const { school: schoolName } = await searchParams;
  const { school, existing } = await loadReportContext(schoolName, "IMPROVEMENT");

  return (
    <AppShell brand={{ title: "문서관리", subtitle: "보고서/목록 관리" }} sections={docsNav()}>
      {!school ? (
        <NoSchool />
      ) : (
        <ImprovementForm
          school={school.name}
          office={school.officeFull}
          district={school.district}
          initial={(existing?.payload as never) ?? null}
          initialStatus={existing?.status ?? null}
        />
      )}
    </AppShell>
  );
}