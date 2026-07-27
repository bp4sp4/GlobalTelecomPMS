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
    // 고정 내부 해상도
    cv.width = cv.offsetWidth;
    cv.height = cv.offsetHeight;
    const ctx = cv.getContext("2d");
    if (ctx && value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, cv.width, cv.height);
      img.src = value;
    }
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
    cv.getContext("2d")!.clearRect(0, 0, cv.width, cv.height);
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
