import styles from "./Card.module.css";

export interface CardProps {
  title?: string;
  meta?: string;
  className?: string;
  children: React.ReactNode;
}

export function Card({ title, meta, className, children }: CardProps) {
  return (
    <section className={`${styles.card} ${className ?? ""}`}>
      {(title || meta) && (
        <div className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {meta && <span className={styles.meta}>{meta}</span>}
        </div>
      )}
      {children}
    </section>
  );
}
