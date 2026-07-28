"use client";

/**
 * 표 안의 텍스트 입력.
 *
 * <input>은 내용이 길면 줄바꿈 없이 잘리기 때문에, 인쇄(PDF)에서는
 * 입력칸을 숨기고 같은 값을 줄바꿈되는 텍스트로 출력한다.
 */
export function CellInput({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const text = typeof rest.value === "string" ? rest.value : String(rest.value ?? "");
  return (
    <>
      <input className={`${className ?? ""} no-print`} {...rest} />
      <span className="print-only print-cell">{text}</span>
    </>
  );
}
