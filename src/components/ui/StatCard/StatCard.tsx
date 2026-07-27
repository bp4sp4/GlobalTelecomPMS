import styles from "./StatCard.module.css";

export interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  percent?: number; // 0~100, 있으면 도넛 표시
}

function Donut({ percent }: { percent: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const dash = (p / 100) * c;
  return (
    <svg className={styles.donut} width="76" height="76" viewBox="0 0 76 76">
      <circle
        cx="38"
        cy="38"
        r={r}
        fill="none"
        stroke="var(--krds-gray-10)"
        strokeWidth="8"
      />
      <circle
        cx="38"
        cy="38"
        r={r}
        fill="none"
        stroke="var(--krds-primary-50)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90 38 38)"
      />
      <text
        x="38"
        y="42"
        textAnchor="middle"
        className={styles.donutText}
      >
        {p.toFixed(1)}%
      </text>
    </svg>
  );
}

export function StatCard({ label, value, sub, percent }: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.body}>
        <p className={styles.label}>{label}</p>
        <div className={styles.value}>{value}</div>
        {sub && <p className={styles.sub}>{sub}</p>}
      </div>
      {percent !== undefined && <Donut percent={percent} />}
    </div>
  );
}
