import styles from "./PageLoading.module.css";

/** 페이지 전환 시 즉시 표시되는 스켈레톤 (체감 속도 개선) */
export function PageLoading() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      <div className={`${styles.bar} ${styles.title}`} />
      <div className={styles.row}>
        <div className={`${styles.bar} ${styles.card}`} />
        <div className={`${styles.bar} ${styles.card}`} />
        <div className={`${styles.bar} ${styles.card}`} />
        <div className={`${styles.bar} ${styles.card}`} />
      </div>
      <div className={`${styles.bar} ${styles.card}`} style={{ height: 220 }} />
    </div>
  );
}
