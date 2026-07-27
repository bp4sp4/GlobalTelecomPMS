import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { ReportType } from "@prisma/client";

function toCsv(rows: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => {
    const str = v == null ? "" : String(v);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n"); // BOM for Excel 한글
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function serialize(type: ReportType, payload: any): (string | number)[][] {
  const rows: (string | number)[][] = [];
  if (type === "EQUIPMENT") {
    rows.push(["No", "분류", "장비명", "제조사", "모델/규격", "수량", "도입일자", "설치위치", "취급자", "상태", "교체여부"]);
    (payload?.items ?? []).forEach((r: any, i: number) =>
      rows.push([i + 1, r.category, r.name, r.manufacturer, r.model, r.qty, r.introDate, r.location, r.handler, r.status, r.replace]));
  } else if (type === "IMPROVEMENT") {
    rows.push(["No", "분류", "장비명", "제조사", "모델/규격", "수량", "설치위치", "개선금액", "개선내용"]);
    (payload?.items ?? []).forEach((r: any, i: number) =>
      rows.push([i + 1, r.category, r.name, r.manufacturer, r.model, r.qty, r.location, r.amount, r.content]));
    rows.push([]);
    rows.push(["개선금액 합계", payload?.total ?? ""]);
  } else if (type === "SPEAKERLINE") {
    rows.push(["[1.송출부]", "판정", "비고"]);
    (payload?.section1 ?? []).forEach((r: any, i: number) => rows.push([`항목${i + 1}`, r.judge, r.note]));
    rows.push([]);
    rows.push(["[2.출력/음압]", "층", "위치", "음압dB", "출력상태", "정격출력W", "수량", "판정", "개선여부", "비고"]);
    (payload?.section2 ?? []).forEach((r: any, i: number) => rows.push([i + 1, r.floor, r.loc, r.db, r.out, r.watt, r.qty, r.judge, r.improve, r.note]));
    rows.push([]);
    rows.push(["[3.임피던스]", "층", "위치", "출력단자", "측정저항Ω", "판정", "개선여부", "비고"]);
    (payload?.section3 ?? []).forEach((r: any, i: number) => rows.push([i + 1, r.floor, r.loc, r.terminal, r.ohm, r.judge, r.improve, r.note]));
  } else if (type === "CONSULTING") {
    rows.push(["시설", "점검항목", "장비", "장애", "동작상태", "조치내용", "조치", "분야", "시급성"]);
    Object.entries(payload?.sections ?? {}).forEach(([fac, list]: [string, any]) => {
      (list ?? []).forEach((r: any) => rows.push([fac, r.item, r.equipment, r.fault, r.state, r.action, r.actionCode, r.field, r.urgency]));
    });
  } else if (type === "PHOTOS") {
    rows.push(["구분", "실", "파일명", "URL"]);
    Object.entries(payload?.photos ?? {}).forEach(([cat, rooms]: [string, any]) => {
      Object.entries(rooms ?? {}).forEach(([room, files]: [string, any]) => {
        (files ?? []).forEach((f: any) => rows.push([cat, room, f.name, f.url]));
      });
    });
  }
  return rows;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const school = searchParams.get("school") ?? "";
  const type = searchParams.get("type") as ReportType;
  const round = searchParams.get("round");

  const s = await prisma.school.findUnique({ where: { name: school } });
  if (!s) return NextResponse.json({ message: "학교 없음" }, { status: 404 });

  const report = await prisma.report.findFirst({
    where: { schoolId: s.id, type, round: round ? Number(round) : null },
    orderBy: { updatedAt: "desc" },
  });
  if (!report) return NextResponse.json({ message: "문서 없음" }, { status: 404 });

  const header: (string | number)[][] = [
    ["학교명", school],
    ["교육지원청", s.educationOffice ? `서울특별시${s.educationOffice}교육지원청` : ""],
    ["유형", type],
    [],
  ];
  const csv = toCsv([...header, ...serialize(type, report.payload)]);
  const fname = `${school}_${type}${round ? `_${round}차` : ""}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`,
    },
  });
}
