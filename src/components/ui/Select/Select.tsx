"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SearchIcon } from "../SearchIcon";
import styles from "./Select.module.css";

export type Option = { value: string; label: string; category?: string };

export interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  size?: "md" | "sm";
  searchable?: boolean;
  className?: string;
  /** 카테고리 코드→한글 라벨. 지정 시 드롭다운 상단에 필터 칩 노출 */
  categoryLabels?: Record<string, string>;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "선택",
  size = "md",
  searchable,
  className,
  categoryLabels,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [pos, setPos] = useState<{ left: number; top: number; width: number; maxH: number; up: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const showSearch = searchable ?? options.length > 12;
  const selected = options.find((o) => o.value === value);

  // 옵션에 존재하는 카테고리 (categoryLabels 순서 우선)
  const categories = useMemo(() => {
    if (!categoryLabels) return [];
    const present = new Set(options.map((o) => o.category).filter(Boolean) as string[]);
    return Object.keys(categoryLabels).filter((k) => present.has(k));
  }, [options, categoryLabels]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return options.filter(
      (o) =>
        (!cat || o.category === cat) &&
        (!kw || o.label.toLowerCase().includes(kw))
    );
  }, [options, q, cat]);

  const place = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const below = vh - r.bottom;
    const above = r.top;
    const extra = (showSearch ? 60 : 0) + (categories.length ? 48 : 0) + 8;
    const desired = Math.min(340, extra + options.length * 40 + 12);
    const up = below < desired && above > below;
    const maxH = Math.max(200, Math.min(desired, (up ? above : below) - 12));
    const width = Math.max(r.width, 320);
    let left = r.left;
    if (left + width > vw - 8) left = vw - 8 - width;
    if (left < 8) left = 8;
    setPos({ left, top: up ? r.top - maxH - 6 : r.bottom + 6, width, maxH, up });
  };

  useLayoutEffect(() => {
    if (open) place();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onScroll(e: Event) {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", () => setOpen(false));
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    setQ("");
    setCat("");
    setOpen((o) => !o);
  }
  function choose(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${styles[size]} ${open ? styles.open : ""} ${className ?? ""}`}
        onClick={toggle}
      >
        <span className={selected ? styles.label : `${styles.label} ${styles.placeholder}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={styles.chev} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {mounted && open && pos &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.menu}
            style={{ left: pos.left, top: pos.top, width: pos.width, maxHeight: pos.maxH }}
          >
            {categories.length > 0 && (
              <div className={styles.chips}>
                <button
                  type="button"
                  className={`${styles.chip} ${cat === "" ? styles.chipActive : ""}`}
                  onClick={() => setCat("")}
                >
                  전체
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`${styles.chip} ${cat === c ? styles.chipActive : ""}`}
                    onClick={() => setCat(c)}
                  >
                    {categoryLabels?.[c] ?? c}
                  </button>
                ))}
              </div>
            )}
            {showSearch && (
              <div className={styles.searchBox}>
                <span className={styles.searchIcon}>
                  <SearchIcon size={15} />
                </span>
                <input
                  className={styles.searchInput}
                  placeholder="검색"
                  value={q}
                  autoFocus
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            )}
            <div className={styles.list}>
              {filtered.length === 0 && <div className={styles.empty}>결과 없음</div>}
              {filtered.map((o) => (
                <button
                  key={o.value || "__empty"}
                  type="button"
                  className={`${styles.option} ${o.value === value ? styles.selected : ""}`}
                  onClick={() => choose(o.value)}
                >
                  <span>{o.label}</span>
                  {o.value === value && (
                    <svg className={styles.check} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
