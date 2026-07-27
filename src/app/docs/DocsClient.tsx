"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

type SchoolHit = { name: string; educationOffice: string | null; district: string | null };

const REPORTS = [
  { key: "consulting", icon: "📄", title: "방송 장비 컨설팅 보고서", desc: "1차/2차 저장·완료 상태 표시" },
  { key: "equipment", icon: "🧾", title: "방송 장비 목록", desc: "학교별 장비 목록 작성/저장/완료" },
  { key: "speakerline", icon: "🔊", title: "스피커 선로 점검 보고서", desc: "선로 점검 작성/저장/완료" },
  { key: "improvement", icon: "🛠", title: "개선보고서", desc: "개선 요청/조치 작성/저장/완료" },
  { key: "photos", icon: "📷", title: "방송사진", desc: "폴더별 사진 업로드 · 저장/완료" },
];

export function DocsClient() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SchoolHit[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const boxRef = useRef<HTMLDivElement>(null);
  const userTyped = useRef(false);

  // 뒤로 돌아와도 선택 유지: localStorage 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem("docs_selected_school");
      if (saved) {
        setSelected(saved);
        setQ(saved);
      }
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (q.trim().length < 1) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/schools?q=${encodeURIComponent(q.trim())}`);
        if (res.ok) {
          setHits(await res.json());
          if (userTyped.current) setOpen(true);
        }
      } catch {
        /* noop */
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(name: string) {
    userTyped.current = false; // 선택 후 재검색으로 목록 다시 뜨는 것 방지
    setSelected(name);
    setQ(name);
    setHits([]);
    setOpen(false);
    try {
      localStorage.setItem("docs_selected_school", name);
    } catch {
      /* noop */
    }
  }

  function clearSelection() {
    userTyped.current = false;
    setSelected("");
    setQ("");
    setHits([]);
    try {
      localStorage.removeItem("docs_selected_school");
    } catch {
      /* noop */
    }
  }

  return (
    <>
      <div className={styles.searchBar} ref={boxRef}>
        <input
          className={styles.searchInput}
          placeholder="학교명(초성/전체명) 입력 후 목록에서 클릭"
          value={q}
          onChange={(e) => {
            userTyped.current = true;
            setQ(e.target.value);
            setSelected("");
          }}
          onFocus={() => hits.length && setOpen(true)}
        />
        {selected && (
          <span className={styles.selected}>
            선택된 학교: <b>{selected}</b>
            <button type="button" className={styles.clearBtn} onClick={clearSelection}>
              초기화
            </button>
          </span>
        )}
        {open && hits.length > 0 && (
          <div className={styles.suggest}>
            {hits.map((h) => (
              <div
                key={h.name}
                className={styles.suggestItem}
                onMouseDown={() => pick(h.name)}
              >
                <span>{h.name}</span>
                <span className={styles.suggestOffice}>
                  {h.educationOffice ?? ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className={styles.cardsHead}>자동 보고서 작성</h2>
      <p className={styles.cardsDesc}>
        학교명을 입력하고 선택하면, 아래에서 보고서 종류를 선택할 수 있습니다.
      </p>

      {selected ? (
        <div className={styles.grid}>
          {REPORTS.map((r) => (
            <Link
              key={r.key}
              href={`/docs/${r.key}?school=${encodeURIComponent(selected)}`}
              className={styles.reportCard}
            >
              <div className={styles.rcIcon} aria-hidden="true">
                {r.icon}
              </div>
              <h3 className={styles.rcTitle}>{r.title}</h3>
              <p className={styles.rcDesc}>{r.desc}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className={styles.hint}>학교를 먼저 검색해서 선택해 주세요.</p>
      )}
    </>
  );
}
