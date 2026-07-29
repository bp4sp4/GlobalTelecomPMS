export const dynamic = "force-dynamic";

import { loadReportContext } from "@/lib/reportServer";
import { PhotosForm } from "./PhotosForm";
import { NoSchool } from "@/components/report/NoSchool";
import { ReportShell } from "@/components/report/ReportShell";

/** 저장되는 PDF 파일명·브라우저 탭에 쓰인다 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ school?: string }>;
}) {
  const { school } = await searchParams;
  return { title: school ? `방송사진 - ${school}` : "방송사진" };
}

export default async function PhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string }>;
}) {
  const { school: schoolName } = await searchParams;
  const { session, school, existing } = await loadReportContext(schoolName, "PHOTOS");

  return (
    <ReportShell session={session}>
      {!school ? (
        <div style={{ padding: 32 }}>
          <NoSchool />
        </div>
      ) : (
        <PhotosForm
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
