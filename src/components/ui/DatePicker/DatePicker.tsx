"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./DatePicker.module.css";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "연도-월-일",
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date(), []);
  const parsed = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return { y, m: m - 1, d };
    }
    return null;
  }, [value]);

  const [viewY, setViewY] = useState(parsed?.y ?? today.getFullYear());
  const [viewM, setViewM] = useState(parsed?.m ?? today.getMonth());

  useEffect(() => {
    if (parsed) {
      setViewY(parsed.y);
      setViewM(parsed.m);
    }
  }, [parsed]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const firstDow = new Date(viewY, viewM, 1).getDay();
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const cells: ({ d: number; other: boolean } | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, other: false });

  function prevMonth() {
    if (viewM === 0) {
      setViewM(11);
      setViewY((y) => y - 1);
    } else setViewM((m) => m - 1);
  }
  function nextMonth() {
    if (viewM === 11) {
      setViewM(0);
      setViewY((y) => y + 1);
    } else setViewM((m) => m + 1);
  }
  function pick(d: number) {
    onChange(toStr(viewY, viewM, d));
    setOpen(false);
  }

  const isToday = (d: number) =>
    viewY === today.getFullYear() && viewM === today.getMonth() && d === today.getDate();
  const isSelected = (d: number) =>
    parsed && parsed.y === viewY && parsed.m === viewM && parsed.d === d;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.open : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={value ? "" : styles.placeholder}>{value || placeholder}</span>
        <svg className={styles.icon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open && (
        <div className={styles.pop}>
          <div className={styles.head}>
            <button type="button" className={styles.navBtn} onClick={prevMonth} aria-label="이전 달">‹</button>
            <span className={styles.headLabel}>{viewY}년 {viewM + 1}월</span>
            <button type="button" className={styles.navBtn} onClick={nextMonth} aria-label="다음 달">›</button>
          </div>
          <div className={styles.grid}>
            {DOW.map((w, i) => (
              <div key={w} className={`${styles.dow} ${i === 0 ? styles.dowSun : ""}`}>{w}</div>
            ))}
            {cells.map((c, i) =>
              c === null ? (
                <div key={`e${i}`} />
              ) : (
                <button
                  key={c.d}
                  type="button"
                  className={`${styles.day} ${isToday(c.d) ? styles.today : ""} ${isSelected(c.d) ? styles.selected : ""}`}
                  onClick={() => pick(c.d)}
                >
                  {c.d}
                </button>
              )
            )}
          </div>
          <div className={styles.footer}>
            <button type="button" className={styles.footBtn} onClick={() => { onChange(""); setOpen(false); }}>
              지우기
            </button>
            <button
              type="button"
              className={styles.footBtn}
              onClick={() => {
                const t = new Date();
                onChange(toStr(t.getFullYear(), t.getMonth(), t.getDate()));
                setOpen(false);
              }}
            >
              오늘
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
