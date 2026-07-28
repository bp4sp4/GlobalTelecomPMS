export const dynamic = "force-dynamic";

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

  // 작성 화면은 문서 편집에 집중하도록 앱 사이드바 없이 단독 레이아웃으로 표시한다.
  if (!school) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--gt-bg)", padding: 32 }}>
        <NoSchool />
      </div>
    );
  }

  return (
    <ConsultingForm
      school={school.name}
      office={school.officeFull}
      district={school.district}
      round={round}
      initial={(existing?.payload as never) ?? null}
      initialStatus={existing?.status ?? null}
    />
  );
}
