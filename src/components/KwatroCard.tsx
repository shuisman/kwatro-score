export type CardColor = 'red' | 'blue' | 'green' | 'yellow';
export type CardShape = 'circle' | 'square' | 'triangle' | 'cross';

const FILL: Record<CardColor, string> = {
  red: '#e5484d',
  blue: '#3e8ed0',
  green: '#30a46c',
  yellow: '#f5b400',
};

/** Own drawing of a Kwatro-style card: big coloured shape with 1–4 pips, value in the corners. */
export function KwatroCard({
  color,
  shape,
  number,
  wild = false,
  size = 64,
  className = '',
  label,
}: {
  color?: CardColor;
  shape?: CardShape;
  number?: 1 | 2 | 3 | 4;
  wild?: boolean;
  size?: number;
  className?: string;
  label?: string;
}) {
  const fill = color ? FILL[color] : '#888';
  const pips = number ?? 0;
  const pipPos: Record<number, [number, number][]> = {
    0: [],
    1: [[50, 50]],
    2: [
      [42, 50],
      [58, 50],
    ],
    3: [
      [50, 41],
      [42, 57],
      [58, 57],
    ],
    4: [
      [42, 42],
      [58, 42],
      [42, 58],
      [58, 58],
    ],
  };
  const pipY = shape === 'triangle' ? 6 : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`shrink-0 ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <rect x="2" y="2" width="96" height="96" rx="12" fill="#1c1c1e" />
      {wild ? (
        <g>
          <path d="M50 18 A32 32 0 0 1 82 50 L50 50 Z" fill={FILL.red} />
          <path d="M82 50 A32 32 0 0 1 50 82 L50 50 Z" fill={FILL.blue} />
          <path d="M50 82 A32 32 0 0 1 18 50 L50 50 Z" fill={FILL.green} />
          <path d="M18 50 A32 32 0 0 1 50 18 L50 50 Z" fill={FILL.yellow} />
        </g>
      ) : (
        <>
          {shape === 'circle' && <circle cx="50" cy="50" r="30" fill={fill} />}
          {shape === 'square' && <rect x="22" y="22" width="56" height="56" rx="4" fill={fill} />}
          {shape === 'triangle' && <path d="M50 16 L84 80 H16 Z" fill={fill} />}
          {shape === 'cross' && (
            <path d="M39 18h22v21h21v22H61v21H39V61H18V39h21z" fill={fill} />
          )}
          {pipPos[pips].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y + pipY} r="4.5" fill="#fff" />
          ))}
          <text x="11" y="21" fontSize="13" fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif">
            {number}
          </text>
          <text
            x="89"
            y="89"
            fontSize="13"
            fontWeight="700"
            fill="#fff"
            fontFamily="system-ui, sans-serif"
            textAnchor="end"
          >
            {number}
          </text>
        </>
      )}
    </svg>
  );
}
