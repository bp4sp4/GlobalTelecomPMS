"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/report/BackButton";
import { saveReport } from "@/lib/reportClient";
import { DatePicker } from "@/components/ui";
import { uploadPhotos } from "@/lib/uploadPhotos";
import e from "@/components/report/editor.module.css";
import p from "./photos.module.css";

const CATEGORIES = ["장비사진", "개선사진", "교육사진", "집중진단"];
const ROOMS = ["방송실", "강당/체육관", "시청각실", "특별실", "다목적실", "소강당", "기타실"];
const GUIDE = [
  "공간 전체 1장 + 장비 근접 1장을 기본으로 촬영합니다",
  "개선사진은 조치 전·후를 같은 각도로 촬영합니다",
  "업로드 후에도 사진 교체·삭제가 가능합니다",
];

type Photo = { url: string; name: string };
type Store = Record<string, Record<string, Photo[]>>; // 구분 → 실 → 사진

export function PhotosForm({
  school, office, district, initial, initialStatus,
}: {
  school: string;
  office: string | null;
  district: string | null;
  initial: { shootDate?: string; handler?: string; memo?: string; photos?: Store } | null;
  initialStatus: "DRAFT" | "DONE" | null;
}) {
  const router = useRouter();
  const [shootDate, setShootDate] = useState(initial?.shootDate ?? "");
  const [handler, setHandler] = useState(initial?.handler ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [store, setStore] = useState<Store>(initial?.photos ?? {});
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  /** 업로드 진행률 (완료 / 전체) */
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  /** 크게 보기 — 어느 실의 몇 번째 사진인지 */
  const [viewer, setViewer] = useState<{ room: string; index: number } | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const get = (room: string): Photo[] => store[cat]?.[room] ?? [];

  async function onFiles(room: string, files: FileList | File[] | null) {
    const list = files ? Array.from(files).filter((f) => f.type.startsWith("image/")) : [];
    if (!list.length) return;
    setUploading(room);
    setProgress({ done: 0, total: list.length });
    setMsg(null);
    try {
      const uploaded = await uploadPhotos({
        school,
        category: cat,
        room,
        files: list,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      setStore((prev) => {
        const next = { ...prev };
        next[cat] = { ...(next[cat] ?? {}) };
        next[cat][room] = [...(next[cat][room] ?? []), ...uploaded];
        return next;
      });
      setMsg({ t: `사진 ${uploaded.length}장을 올렸습니다. 저장을 눌러 반영하세요.`, ok: true });
    } catch (err) {
      setMsg({ t: (err as Error).message, ok: false });
    } finally {
      setUploading(null);
      setProgress(null);
    }
  }

  function removePhoto(room: string, idx: number) {
    setStore((prev) => {
      const next = { ...prev };
      next[cat] = { ...(next[cat] ?? {}) };
      next[cat][room] = (next[cat][room] ?? []).filter((_, i) => i !== idx);
      return next;
    });
  }
  /** 크게 보기 좌우 이동 (같은 실 안에서 순환) */
  function moveViewer(step: number) {
    setViewer((v) => {
      if (!v) return v;
      const list = store[cat]?.[v.room] ?? [];
      if (!list.length) return null;
      return { ...v, index: (v.index + step + list.length) % list.length };
    });
  }

  useEffect(() => {
    if (!viewer) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setViewer(null);
      if (ev.key === "ArrowRight") moveViewer(1);
      if (ev.key === "ArrowLeft") moveViewer(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer]);

  function clearRoom(room: string) {
    if (!get(room).length) return;
    if (!confirm(`${cat} · ${room}의 사진을 모두 목록에서 제거할까요?`)) return;
    setStore((prev) => {
      const next = { ...prev };
      next[cat] = { ...(next[cat] ?? {}) };
      next[cat][room] = [];
      return next;
    });
  }

  const stats = useMemo(() => {
    const counts = ROOMS.map((r) => (store[cat]?.[r] ?? []).length);
    const total = counts.reduce((a, b) => a + b, 0);
    const done = counts.filter((n) => n > 0).length;
    return { total, done, empty: ROOMS.length - done, pct: Math.round((done / ROOMS.length) * 100) };
  }, [store, cat]);

  const allTotal = useMemo(
    () =>
      Object.values(store).reduce(
        (n, rooms) => n + Object.values(rooms ?? {}).reduce((m, ph) => m + (ph?.length ?? 0), 0),
        0
      ),
    [store]
  );

  async function doSave(status: "DRAFT" | "DONE") {
    setBusy(true);
    setMsg(null);
    try {
      await saveReport({
        school,
        type: "PHOTOS",
        payload: { shootDate, handler, memo, photos: store },
        status,
      });
      if (status === "DONE") {
        // 완료 처리 후에는 문서 작성 화면으로 돌아간다
        setMsg({ t: "완료 처리되었습니다. 문서 작성으로 이동합니다…", ok: true });
        router.push("/docs");
        router.refresh();
        return;
      }
      setMsg({ t: "저장(초안)되었습니다.", ok: true });
    } catch (err) {
      setMsg({ t: (err as Error).message, ok: false });
    } finally {
      setBusy(false);
    }
  }

  const statusLabel =
    initialStatus === "DONE" ? "저장 완료" : initialStatus === "DRAFT" ? "저장(초안)" : "미작성";

  return (
    <div className={e.page}>
      <header className={`${e.topbar} no-print`}>
        <div className={e.topInner}>
          <div style={{ minWidth: 0 }}>
            <div className={e.titleRow}>
              <h1 className={e.h1}>방송사진</h1>
              <span className={e.badge}>{statusLabel}</span>
            </div>
            <div className={e.topMeta}>
              {school} · 폴더별 사진 업로드 · 총 {allTotal}장
            </div>
          </div>

          <div className={e.topActions}>
            <BackButton className={`${e.btn} ${e.btnMuted}`} />
            <a
              className={e.btn}
              href={`/api/reports/export?school=${encodeURIComponent(school)}&type=PHOTOS`}
            >
              CSV
            </a>
            <a
              className={e.btn}
              href={`/api/photos/zip?school=${encodeURIComponent(school)}`}
              title="저장된 사진을 구분/실 폴더 그대로 묶어 내려받습니다"
            >
              ZIP 내려받기
            </a>
            <span className={e.vbar} />
            <button type="button" className={`${e.btn} ${e.btnOutline}`} disabled={busy} onClick={() => doSave("DRAFT")}>
              저장
            </button>
            <button type="button" className={`${e.btn} ${e.btnPrimary}`} disabled={busy} onClick={() => doSave("DONE")}>
              완료 처리
            </button>
          </div>
        </div>
      </header>

      {/* 사진을 최대한 넓게 — 요약 패널은 240px 로 줄인다 */}
      <div className={e.layout} style={{ gridTemplateColumns: "minmax(0,1fr) 240px" }}>
        <div className={e.content}>
          {msg && <div className={`${e.msg} ${msg.ok ? e.msgOk : e.msgErr}`}>{msg.t}</div>}

          {/* 기본 정보 */}
          <section className={e.card}>
            <h2 className={e.h2}>기본 정보</h2>
            <div className={e.infoGrid} style={{ gridTemplateColumns: "repeat(6,minmax(130px,1fr))" }}>
              <label className={e.field}>
                <span className={e.label}>학교명</span>
                <input readOnly value={school} className={`${e.readonly} ${e.readonlyStrong}`} />
              </label>
              <label className={e.field}>
                <span className={e.label}>지청</span>
                <input readOnly value={office ?? ""} className={e.readonly} />
              </label>
              <label className={e.field}>
                <span className={e.label}>주소</span>
                <input readOnly value={district ?? ""} className={e.readonly} />
              </label>
              <div className={e.field}>
                <span className={e.label}>촬영/점검일</span>
                <DatePicker value={shootDate} onChange={setShootDate} />
              </div>
              <label className={e.field}>
                <span className={e.label}>담당자</span>
                <input className={e.input} placeholder="성명" value={handler} onChange={(ev) => setHandler(ev.target.value)} />
              </label>
              <label className={e.field}>
                <span className={e.label}>메모</span>
                <input className={e.input} placeholder="비고" value={memo} onChange={(ev) => setMemo(ev.target.value)} />
              </label>
            </div>
          </section>

          {/* 사진 구분 + 폴더 */}
          <section className={e.card}>
            <div className={e.cardHead}>
              <h2 className={e.h2}>사진 구분</h2>
              <div className={p.tabs}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`${p.tab} ${cat === c ? p.tabActive : ""}`}
                    onClick={() => setCat(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className={p.folders}>
              {ROOMS.map((room) => {
                const photos = get(room);
                const has = photos.length > 0;
                const isUp = uploading === room;
                const over = dragOver === room;
                const open = expanded[`${cat}|${room}`];
                const shown = open ? photos : photos.slice(0, 30);

                return (
                  <div key={room} className={p.folder}>
                    <div className={p.folderHead}>
                      <div style={{ minWidth: 0 }}>
                        <div className={p.folderName}>{room}</div>
                        <div className={`${p.folderMeta} ${has ? p.folderMetaOn : ""}`}>
                          {has ? `${photos.length}장 업로드됨` : "업로드된 사진 없음"}
                        </div>
                      </div>
                      <div className={p.headRight}>
                        <span className={`${p.pill} ${has ? p.pillOn : ""}`}>
                          {has ? "완료" : "대기"}
                        </span>
                        <button
                          type="button"
                          className={p.findBtn}
                          disabled={isUp}
                          onClick={() => inputs.current[room]?.click()}
                        >
                          {isUp && progress ? `업로드 ${progress.done}/${progress.total}` : isUp ? "업로드 중..." : "사진 찾기"}
                        </button>
                        <button
                          type="button"
                          className={p.clearBtn}
                          disabled={!has}
                          onClick={() => clearRoom(room)}
                        >
                          전체 삭제
                        </button>
                      </div>
                    </div>

                    <div
                      className={`${p.drop} ${has ? p.dropFilled : ""} ${over ? p.dropOver : ""}`}
                      onClick={() => !isUp && inputs.current[room]?.click()}
                      onDragOver={(ev) => {
                        ev.preventDefault();
                        setDragOver(room);
                      }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(ev) => {
                        ev.preventDefault();
                        setDragOver(null);
                        onFiles(room, ev.dataTransfer.files);
                      }}
                    >
                      <span className={p.dropTitle}>
                        {isUp && progress ? `업로드 중 ${progress.done} / ${progress.total}장` : isUp ? "업로드 중..." : has ? "사진 추가" : "사진을 업로드하세요"}
                      </span>
                      <span className={p.dropHint}>클릭하거나 파일을 끌어다 놓으세요 · JPG/PNG</span>
                    </div>

                    <input
                      ref={(el) => {
                        inputs.current[room] = el;
                      }}
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={(ev) => {
                        onFiles(room, ev.target.files);
                        ev.target.value = "";
                      }}
                    />

                    {has && (
                      <>
                        <div className={p.thumbs}>
                          {shown.map((ph, i) => (
                            <figure key={`${ph.url}-${i}`} className={p.thumbBox}>
                              <button
                                type="button"
                                className={p.thumbBtn}
                                onClick={() => setViewer({ room, index: i })}
                                title="크게 보기"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={ph.url} alt={ph.name} className={p.thumb} loading="lazy" />
                              </button>
                              <button
                                type="button"
                                className={p.thumbDel}
                                aria-label="사진 제거"
                                onClick={() => removePhoto(room, i)}
                              >
                                ×
                              </button>
                              <figcaption className={p.thumbName} title={ph.name}>
                                {ph.name}
                              </figcaption>
                            </figure>
                          ))}
                        </div>
                        {photos.length > 30 && (
                          <button
                            type="button"
                            className={p.moreBtn}
                            onClick={() =>
                              setExpanded((s) => ({ ...s, [`${cat}|${room}`]: !open }))
                            }
                          >
                            {open ? "접기" : `+ ${photos.length - 30}장 더 보기`}
                          </button>
                        )}
                      </>
                    )}

                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* 우측 */}
        <div className={e.toc}>
          <section className={e.sideCard} style={{ padding: 24, gap: 16 }}>
            <div className={e.sideTitle}>업로드 현황 · {cat}</div>
            <div className={p.bigNum}>
              <b>{stats.total}</b>
              <span>장</span>
            </div>
            <div className={p.bar}>
              <div className={p.barFill} style={{ width: `${stats.pct}%` }} />
            </div>
            <div className={e.sideRow}>
              <span className={e.sideKey}>사진 있는 폴더</span>
              <span className={p.valOk}>{stats.done}</span>
            </div>
            <div className={e.sideRow}>
              <span className={e.sideKey}>비어 있는 폴더</span>
              <span className={p.valOff}>{stats.empty}</span>
            </div>
            <div className={e.divider} />
            <div className={e.sideRow}>
              <span className={e.sideKey}>전체 구분 합계</span>
              <span className={e.sideVal}>{allTotal}장</span>
            </div>
          </section>

          <section className={e.sideCard} style={{ padding: 24, gap: 12 }}>
            <div className={e.sideTitle}>촬영 가이드</div>
            <div className={p.guide}>
              {GUIDE.map((t) => (
                <div key={t} className={p.guideRow}>
                  <span className={p.guideDot} />
                  <span className={p.guideText}>{t}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* 크게 보기 */}
      {viewer && (() => {
        const list = store[cat]?.[viewer.room] ?? [];
        const ph = list[viewer.index];
        if (!ph) return null;
        return (
          <div className={`${p.viewer} no-print`} onClick={() => setViewer(null)}>
            <div className={p.viewerBar} onClick={(ev) => ev.stopPropagation()}>
              <span className={p.viewerTitle}>
                {cat} · {viewer.room}
                <span className={p.viewerCount}>
                  {viewer.index + 1} / {list.length}
                </span>
              </span>
              <a className={p.viewerBtn} href={ph.url} target="_blank" rel="noreferrer">
                원본 열기
              </a>
              <button type="button" className={p.viewerBtn} onClick={() => setViewer(null)}>
                닫기 ✕
              </button>
            </div>

            <div className={p.viewerStage} onClick={(ev) => ev.stopPropagation()}>
              {list.length > 1 && (
                <button
                  type="button"
                  className={`${p.viewerNav} ${p.viewerPrev}`}
                  onClick={() => moveViewer(-1)}
                  aria-label="이전 사진"
                >
                  ‹
                </button>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.url} alt={ph.name} className={p.viewerImg} />
              {list.length > 1 && (
                <button
                  type="button"
                  className={`${p.viewerNav} ${p.viewerNext}`}
                  onClick={() => moveViewer(1)}
                  aria-label="다음 사진"
                >
                  ›
                </button>
              )}
            </div>

            <div className={p.viewerCaption} onClick={(ev) => ev.stopPropagation()}>
              {ph.name}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
