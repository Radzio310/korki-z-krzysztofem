/* Znak marki: fala, która jest jednocześnie wykresem funkcji — morze i matematyka w jednym. */
export default function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg className={`logo ${className}`} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="kk-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7BE7F0" />
          <stop offset="55%" stopColor="#12A8C4" />
          <stop offset="100%" stopColor="#0A5C86" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="10" fill="url(#kk-logo-g)" />
      <path d="M5 19 C 8.5 12, 11.5 12, 15 19 S 21.5 26, 27 15" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="27" cy="15" r="2.4" fill="#FFC857" />
      <path d="M6 8.5h5M8.5 6v5" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".9" />
    </svg>
  );
}
