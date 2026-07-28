/** 검색 아이콘 (돋보기) — 색상은 currentColor 를 따른다 */
export function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.7609 13.2391C8.42086 10.8991 8.42086 7.09914 10.7609 4.74914C13.1009 2.40914 16.9009 2.40914 19.2509 4.74914C21.5909 7.08914 21.5909 10.8891 19.2509 13.2391C16.9109 15.5791 13.1109 15.5791 10.7609 13.2391Z" />
      <path d="M10.5 13.5L3 21" />
    </svg>
  );
}
