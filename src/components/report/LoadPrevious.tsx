"use client";

import { useEffect, useState } from "react";
import type { ReportType } from "@prisma/client";
import s from "./loadPrevious.module.css";

type Prev = {
  found: boolean;
  round?: number | null;
  status?: "DRAFT" | "DONE";
  at?: string;
  payload?: unknown;
};

/**
 * 이전 회차/직전 문서 불러오기 배너.
 * 현재 문서가 비어 있을 때만(=덮어쓸 내용이 없을 때) 노출한다.
 */
export function LoadPrevious({
  school,
  type,
  round,
  isEmpty,
  onLoad,
  label,
}: {
  school: string;
  type: ReportType;
  round?: number;
  /** 현재 화면에 입력된 내용이 없는지 */
  isEmpty: boolean;
  /** 이전 payload 를 받아 폼 상태에 반영 */
  onLoad: (payload: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  /** 배너 문구 (예: "1차 컨설팅") */
  label?: string;
}) {
  const [prev, setPrev] = useState<Prev | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const p = new URLSearchParams({ school, type });
        if (round) p.set("round", String(round));
        const r = await fetch(`/api/reports/previous?${p}`);
        if (!r.ok) return;
        const d = (await r.json()) as Prev;
        if (!dead && d.found) setPrev(d);
      } catch {
        /* 불러오기 실패는 조용히 무시 — 없어도 작성에 지장 없음 */
      }
    })();
    return () => {
      dead = true;
    };
  }, [school, type, round]);

  if (!prev?.found || done || !isEmpty) return null;

  const what =
    label ??
    (type === "CONSULTING" && prev.round ? `${prev.round}차 컨설팅` : "직전 문서");

  return (
    <div className={`${s.bar} no-print`}>
      <span className={s.icon}>↺</span>
      <span className={s.text}>
        <b>{what}</b> 내용을 불러올 수 있습니다
        <span className={s.meta}>
          {prev.at} · {prev.status === "DONE" ? "완료" : "초안"}
        </span>
      </span>
      <button
        type="button"
        className={s.btn}
        onClick={() => {
          onLoad(prev.payload);
          setDone(true);
        }}
      >
        불러오기
      </button>
      <button type="button" className={s.close} onClick={() => setDone(true)} aria-label="닫기">
        ×
      </button>
    </div>
  );
}
