export const dynamic = "force-dynamic";

import { AppShell } from "@/components/layout/AppShell";
import { docsNav } from "@/lib/nav";
import { loadReportContext } from "@/lib/reportServer";
import { ConsultingForm } from "./ConsultingForm";
import { NoSchool } from "@/components/report/NoSchool";

export default async function ConsultingNewPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; round?: string }>;
}) {
  const { school: schoolName, round: roundRaw } = await searchParams;
  const round = roundRaw === "2" ? 2 : 1;
  const { school, existing } = await loadReportContext(schoolName, "CONSULTING", round);

  return (
    <AppShell brand={{ title: "문서관리", subtitle: "보고서/목록 관리" }} sections={docsNav()}>
      {!school ? (
        <NoSchool />
      ) : (
        <ConsultingForm
          school={school.name}
          office={school.officeFull}
          district={school.district}
          round={round}
          initial={(existing?.payload as never) ?? null}
          initialStatus={existing?.status ?? null}
        />
      )}
    </AppShell>
  );
}