export const dynamic = "force-dynamic";

import { loadReportContext } from "@/lib/reportServer";
import { EquipmentForm } from "./EquipmentForm";
import { NoSchool } from "@/components/report/NoSchool";
import { ReportShell } from "@/components/report/ReportShell";

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string }>;
}) {
  const { school: schoolName } = await searchParams;
  const { session, school, existing } = await loadReportContext(schoolName, "EQUIPMENT");

  return (
    <ReportShell session={session}>
      {!school ? (
        <div style={{ padding: 32 }}>
          <NoSchool />
        </div>
      ) : (
        <EquipmentForm
          school={school.name}
          office={school.officeFull}
          district={school.district}
          initial={(existing?.payload as never) ?? null}
          initialStatus={existing?.status ?? null}
        />
      )}
    </ReportShell>
  );
}
