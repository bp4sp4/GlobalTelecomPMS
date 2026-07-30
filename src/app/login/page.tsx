"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import styles from "./page.module.css";

function EyeIcon({ off }: { off?: boolean }) {
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return off ? (
    <svg {...common}>
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  ) : (
    <svg {...common}>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const ready = username.trim() !== "" && password !== "" && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "아이디 또는 비밀번호가 올바르지 않습니다.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.wrap}>
      <form className={styles.card} onSubmit={onSubmit}>
        {/* 로고 + 설명을 한 덩어리로 (사이 간격은 .title 의 margin-top) */}
        <div>
          <div className={styles.brand}>
            <Logo height={34} />
          </div>
          <h1 className={styles.title}>방송장비 컨설팅 문서 자동화 시스템</h1>
        </div>

        <div className={styles.fields}>
          <div className={styles.field}>
            <input
              id="username"
              className={styles.input}
              placeholder=" "
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <label htmlFor="username" className={styles.label}>
              아이디
            </label>
          </div>

          <div className={`${styles.field} ${styles.hasToggle}`}>
            <input
              id="password"
              className={styles.input}
              placeholder=" "
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label htmlFor="password" className={styles.label}>
              비밀번호
            </label>
            <button
              type="button"
              tabIndex={-1}
              className={styles.toggle}
              aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"}
              onClick={() => setShow((v) => !v)}
            >
              <EyeIcon off={show} />
            </button>
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" className={styles.submit} disabled={!ready}>
          {loading ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </main>
  );
}
