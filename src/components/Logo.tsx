/** Own mark: four dark tiles, one shape per colour. Not the publisher's artwork. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect x="2" y="2" width="28" height="28" rx="6" fill="#1c1c1e" />
      <rect x="34" y="2" width="28" height="28" rx="6" fill="#1c1c1e" />
      <rect x="2" y="34" width="28" height="28" rx="6" fill="#1c1c1e" />
      <rect x="34" y="34" width="28" height="28" rx="6" fill="#1c1c1e" />
      <circle cx="16" cy="16" r="8" fill="#e5484d" />
      <rect x="40" y="8" width="16" height="16" rx="2" fill="#3e8ed0" />
      <path d="M16 40 L24.5 55 H7.5 Z" fill="#30a46c" />
      <path d="M45 39h6v6h6v6h-6v6h-6v-6h-6v-6h6z" fill="#f5b400" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-extrabold tracking-tight">
      <LogoMark />
      <span>
        Kwatro <span className="text-muted font-bold">Score</span>
      </span>
    </span>
  );
}
