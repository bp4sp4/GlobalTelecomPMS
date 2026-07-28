"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";
import styles from "./AppShell.module.css";

export type NavItem = { label: string; href: string; icon?: string };
export type NavSection = { title: string; items: NavItem[] };

export interface AppShellProps {
  brand?: { title: string; subtitle?: string; icon?: string };
  sections: NavSection[];
  children: React.ReactNode;
}

function resolveActive(pathname: string, sections: NavSection[]): string | null {
  let best: string | null = null;
  for (const sec of sections) {
    for (const it of sec.items) {
      if (it.href.startsWith("/api")) continue;
      const match = pathname === it.href || pathname.startsWith(it.href + "/");
      if (match && (best === null || it.href.length > best.length)) best = it.href;
    }
  }
  return best;
}

export function AppShell({ brand, sections, children }: AppShellProps) {
  const pathname = usePathname();
  const activeHref = resolveActive(pathname, sections);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sidebar_collapsed") === "1");
    } catch {
      /* noop */
    }
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("sidebar_collapsed", next ? "1" : "0");
      } catch {
        /* noop */
      }
      return next;
    });
  }

  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ""}`}>
      <header className={`${styles.gnb} no-print`}>
        <div className={styles.gnbInner}>
          <div className={styles.gnbLeft}>
            <Link href="/dashboard" className={styles.brand}>
              <span className={styles.wordmark} aria-label="GlobalTelecom">
                <span className={styles.wmRed}>G</span>lobal
                <span className={styles.wmRed}>T</span>elecom
              </span>
            </Link>
            <button
              type="button"
              className={styles.collapseBtn}
              onClick={toggle}
              aria-label="메뉴 접기/펼치기"
              aria-expanded={!collapsed}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                {collapsed ? (
                  <path fillRule="evenodd" clipRule="evenodd" d="M14.5 14.25C14.5 14.4489 14.421 14.6397 14.2803 14.7803C14.1397 14.921 13.9489 15 13.75 15C13.5511 15 13.3603 14.921 13.2197 14.7803C13.079 14.6397 13 14.4489 13 14.25V1.75C13 1.55109 13.079 1.36032 13.2197 1.21967C13.3603 1.07902 13.5511 1 13.75 1C13.9489 1 14.1397 1.07902 14.2803 1.21967C14.421 1.36032 14.5 1.55109 14.5 1.75V14.25ZM6.659 4.22C6.51855 4.36063 6.43966 4.55125 6.43966 4.75C6.43966 4.94875 6.51855 5.13937 6.659 5.28L8.629 7.25H2.25C2.05109 7.25 1.86032 7.32902 1.71967 7.46967C1.57902 7.61032 1.5 7.80109 1.5 8C1.5 8.19891 1.57902 8.38968 1.71967 8.53033C1.86032 8.67098 2.05109 8.75 2.25 8.75H8.629L6.659 10.72C6.58531 10.7887 6.52621 10.8715 6.48522 10.9635C6.44423 11.0555 6.42218 11.1548 6.42041 11.2555C6.41863 11.3562 6.43716 11.4562 6.47488 11.5496C6.5126 11.643 6.56874 11.7278 6.63996 11.799C6.71118 11.8703 6.79601 11.9264 6.8894 11.9641C6.98279 12.0018 7.08282 12.0204 7.18352 12.0186C7.28423 12.0168 7.38354 11.9948 7.47554 11.9538C7.56754 11.9128 7.65034 11.8537 7.719 11.78L10.97 8.53C11.2627 8.23729 11.2627 7.76271 10.97 7.47L7.72 4.22C7.65035 4.15031 7.56765 4.09502 7.47662 4.0573C7.3856 4.01958 7.28803 4.00016 7.1895 4.00016C7.09097 4.00016 6.9934 4.01958 6.90238 4.0573C6.81135 4.09502 6.72865 4.15031 6.659 4.22Z" fill="currentColor" />
                ) : (
                  <path fillRule="evenodd" clipRule="evenodd" d="M1.5 14.25C1.5 14.4489 1.57902 14.6397 1.71967 14.7803C1.86032 14.921 2.05109 15 2.25 15C2.44891 15 2.63968 14.921 2.78033 14.7803C2.92098 14.6397 3 14.4489 3 14.25V1.75C3 1.55109 2.92098 1.36032 2.78033 1.21967C2.63968 1.07902 2.44891 1 2.25 1C2.05109 1 1.86032 1.07902 1.71967 1.21967C1.57902 1.36032 1.5 1.55109 1.5 1.75V14.25ZM9.341 4.22C9.48145 4.36063 9.56034 4.55125 9.56034 4.75C9.56034 4.94875 9.48145 5.13937 9.341 5.28L7.371 7.25H13.75C13.9489 7.25 14.1397 7.32902 14.2803 7.46967C14.421 7.61032 14.5 7.80109 14.5 8C14.5 8.19891 14.421 8.38968 14.2803 8.53033C14.1397 8.67098 13.9489 8.75 13.75 8.75H7.371L9.341 10.72C9.41469 10.7887 9.47379 10.8715 9.51478 10.9635C9.55577 11.0555 9.57782 11.1548 9.57959 11.2555C9.58137 11.3562 9.56284 11.4562 9.52512 11.5496C9.4874 11.643 9.43126 11.7278 9.36004 11.799C9.28882 11.8703 9.20399 11.9264 9.1106 11.9641C9.01721 12.0018 8.91718 12.0204 8.81648 12.0186C8.71577 12.0168 8.61646 11.9948 8.52446 11.9538C8.43246 11.9128 8.34966 11.8537 8.281 11.78L5.03 8.53C4.73729 8.23729 4.73729 7.76271 5.03 7.47L8.28 4.22C8.34965 4.15031 8.43235 4.09502 8.52338 4.0573C8.6144 4.01958 8.71197 4.00016 8.8105 4.00016C8.90903 4.00016 9.0066 4.01958 9.09762 4.0573C9.18865 4.09502 9.27135 4.15031 9.341 4.22Z" fill="currentColor" />
                )}
              </svg>
            </button>
          </div>
          <div className={styles.gnbRight}>
            <span className={styles.gnbBadge}>서울특별시교육청</span>
          </div>
        </div>
      </header>

      <div className={styles.body}>
        <aside className={`${styles.sidebar} no-print`}>
          <nav>
            {sections.map((sec) => (
              <div key={sec.title} className={styles.section}>
                <p className={styles.sectionTitle}>{sec.title}</p>
                {sec.items.map((it) => {
                  const active = it.href === activeHref;
                  // 로그아웃 등 API 라우트는 Link(프리페치) 금지 → POST 버튼으로 처리
                  if (it.href.startsWith("/api/auth/logout")) {
                    return (
                      <LogoutButton
                        key={it.href + it.label}
                        className={styles.navItem}
                      />
                    );
                  }
                  return (
                    <Link
                      key={it.href + it.label}
                      href={it.href}
                      className={`${styles.navItem} ${active ? styles.active : ""}`}
                    >
                      {it.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>
        <main className={styles.main}>
          <div className={styles.container}>{children}</div>
        </main>
      </div>
    </div>
  );
}
