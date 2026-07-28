/**
 * 인쇄 전용 기본 정보 표.
 * 화면의 카드형 기본 정보(infoGrid)는 인쇄에서 숨기고, 이 표가 대신 출력된다.
 * CSS로 화면 구조를 변형하는 대신 전용 마크업을 쓰므로 어떤 입력 컴포넌트를 써도 깨지지 않는다.
 */
export function PrintInfoTable({
  pairs,
  columns = 3,
}: {
  pairs: { label: string; value: string }[];
  columns?: number;
}) {
  const rows: { label: string; value: string }[][] = [];
  for (let i = 0; i < pairs.length; i += columns) {
    rows.push(pairs.slice(i, i + columns));
  }

  return (
    <table className="print-only print-info">
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            {row.map((p) => (
              <PrintPair key={p.label} label={p.label} value={p.value} />
            ))}
            {/* 마지막 줄 빈 칸 채우기 — 표 오른쪽 테두리를 맞춘다 */}
            {row.length < columns &&
              Array.from({ length: columns - row.length }, (_, i) => (
                <PrintPair key={`pad${i}`} label="" value="" />
              ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PrintPair({ label, value }: { label: string; value: string }) {
  return (
    <>
      <th>{label}</th>
      <td>{value}</td>
    </>
  );
}
