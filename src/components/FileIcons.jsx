// ─── FileIcons.jsx ────────────────────────────────────────────────────────────
// SVG icons matching the XLS (green) and PDF (red) file type icons.
// Usage: <XlsIcon size={22} />  <PdfIcon size={22} />

export function XlsIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', flexShrink: 0 }}
    >
      <rect x="0" y="0" width="80" height="100" rx="8" fill="#0a7a3b" />
      <polygon points="58,0 80,0 80,22" fill="#065c2b" />
      <polygon points="58,0 80,22 58,22" fill="#2ea05c" />
      <text
        x="40" y="72"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontSize="26"
        fill="white"
      >XLS</text>
    </svg>
  );
}

export function PdfIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 110"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', flexShrink: 0 }}
    >
      <rect x="0" y="0" width="80" height="110" rx="8" fill="#e02020" />
      <polygon points="58,0 80,0 80,22" fill="#9b0000" />
      <polygon points="58,0 80,22 58,22" fill="#c01010" />
      <path
        d="M40,28 C40,28 54,30 58,44 C62,58 52,68 40,68 C28,68 18,58 22,44 C26,30 40,28 40,28"
        fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"
      />
      <path d="M40,68 C30,68 22,62 22,52" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M40,68 C50,68 58,62 58,52" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
      <text
        x="40" y="100"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontSize="20"
        fill="white"
        letterSpacing="2"
      >PDF</text>
    </svg>
  );
}