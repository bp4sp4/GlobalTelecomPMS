import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "방송장비 컨설팅 문서자동화 시스템",
  description: "학교별 방송·음향 장비 점검 및 컨설팅 보고서 관리",
};

/** 태블릿·모바일에서 화면이 축소되지 않게. 확대는 허용(서명·표 확인용) */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
