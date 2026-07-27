import Link from "next/link";
import s from "./report.module.css";

export function NoSchool() {
  return (
    <div className={s.panel} style={{ textAlign: "center" }}>
      <p style={{ marginBottom: "1.6rem", color: "var(--krds-color-text-caption)" }}>
        학교가 선택되지 않았습니다. 문서관리에서 학교를 먼저 선택해 주세요.
      </p>
      <Link href="/docs" className={`${s.btn} ${s.btnPrimary}`}>
        문서관리로 이동
      </Link>
    </div>
  );
}
