"use client";

import { useEffect, useRef } from "react";
import styles from "./SignaturePad.module.css";

export function SignaturePad({
  value,
  onChange,
  height = 100,
}: {
  value?: string;
  onChange: (dataUrl: string) => void;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;

    /** 표시 크기에 맞춰 캔버스 내부 해상도를 잡고 기존 서명을 다시 그린다.
     *  (태블릿 회전·창 크기 변경 시 좌표가 어긋나거나 흐려지는 것을 막는다) */
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = cv.offsetWidth;
      const h = cv.offsetHeight;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      const c = cv.getContext("2d");
      if (!c) return;
      c.setTransform(dpr, 0, 0, dpr, 0, 0); // 이후 좌표는 CSS 픽셀 기준
      if (value) {
        const img = new Image();
        img.onload = () => c.drawImage(img, 0, 0, w, h);
        img.src = value;
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(cv);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pos(e: React.PointerEvent) {
    const cv = ref.current!;
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function down(e: React.PointerEvent) {
    drawing.current = true;
    last.current = pos(e);
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext("2d")!;
    const p = pos(e);
    ctx.strokeStyle = "#1e2124";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  }
  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(ref.current!.toDataURL("image/png"));
  }
  function clear() {
    const cv = ref.current!;
    // 컨텍스트가 dpr 로 스케일되어 있으므로 CSS 픽셀 기준으로 지운다
    cv.getContext("2d")!.clearRect(0, 0, cv.offsetWidth, cv.offsetHeight);
    onChange("");
  }

  return (
    <div>
      <canvas
        ref={ref}
        className={styles.pad}
        style={{ height }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      />
      <button type="button" className={`${styles.clear} no-print`} onClick={clear}>
        지우기
      </button>
    </div>
  );
}
