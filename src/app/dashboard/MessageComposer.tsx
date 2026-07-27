"use client";

import { useState } from "react";
import styles from "./page.module.css";

type Msg = { id: string; content: string; createdAt: string; author: { username: string } };

function fmt(d: string) {
  return new Date(d).toISOString().slice(0, 19).replace("T", " ");
}

export function MessageComposer({ initial }: { initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const content = text.trim();
    if (!content) return;
    setBusy(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const d = await res.json();
      if (res.ok) {
        setMessages((m) => [d.message, ...m]);
        setText("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.msgList}>
        {messages.length === 0 && <p className={styles.placeholder}>등록된 공지가 없습니다.</p>}
        {messages.map((m) => (
          <div key={m.id} className={styles.msg}>
            <div className={styles.msgHead}>
              <span className={styles.msgBadge}>{m.author.username}</span>
              <span className={styles.msgTime}>{fmt(m.createdAt)}</span>
            </div>
            <p className={styles.msgBody}>{m.content}</p>
          </div>
        ))}
      </div>
      <div className={styles.composer}>
        <textarea
          className={styles.composerInput}
          placeholder="메시지를 입력하세요 (최대 1000자)"
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className={styles.sendBtn} disabled={busy || !text.trim()} onClick={send}>
          전송
        </button>
      </div>
    </>
  );
}
