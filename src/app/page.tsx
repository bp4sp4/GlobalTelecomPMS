import { redirect } from "next/navigation";

export default function Home() {
  // 원본과 동일: 진입 시 로그인/대시보드로 유도
  redirect("/login");
}
