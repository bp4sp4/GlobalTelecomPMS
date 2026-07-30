import Image from "next/image";
import styles from "./Logo.module.css";

/**
 * 테마별 로고.
 *
 * 두 장을 함께 심고 CSS 로 보여줄 것만 고른다.
 * (JS 로 src 를 갈아끼우면 첫 페인트에 반대 색 로고가 잠깐 보인다)
 *
 * 주의: 파일명과 글자색이 반대다 — 이름은 "어떤 배경에 쓰는지" 기준이다.
 *   logo_black.png … 흰 글자  → 다크 모드
 *   logo_white.png … 검정 글자 → 라이트 모드
 */
export function Logo({ height = 22 }: { height?: number }) {
  return (
    <span className={styles.logo} style={{ height }}>
      <Image
        className={styles.light}
        src="/logo_white.png"
        alt="GlobalTelecom"
        width={474}
        height={74}
        priority
      />
      <Image
        className={styles.dark}
        src="/logo_black.png"
        alt=""
        aria-hidden="true"
        width={209}
        height={27}
        priority
      />
    </span>
  );
}
