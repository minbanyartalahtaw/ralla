import { cn } from "@/lib/utils";

const PETALS = [0, 72, 144, 216, 288];

export function Blossom({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-120 -120 240 240"
      aria-hidden
      className={cn("pointer-events-none select-none", className)}
    >
      {PETALS.map((angle) => (
        <g key={angle} transform={`rotate(${angle})`}>
          <path
            d="M0 -6 C-44 -26 -52 -82 -16 -106 L0 -92 L16 -106 C52 -82 44 -26 0 -6 Z"
            className="fill-ralla-100"
          />
          <path
            d="M0 -14 C-22 -34 -26 -66 -10 -86 L0 -78 Z"
            className="fill-ralla-200/50"
          />
          <path
            d="M0 -22 L0 -44"
            className="stroke-ralla-600"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle cx={0} cy={-50} r={4.5} className="fill-ralla-50" />
        </g>
      ))}
      {PETALS.map((angle) => (
        <path
          key={angle}
          transform={`rotate(${angle + 36})`}
          d="M0 0 L-7 -18 L0 -30 L7 -18 Z"
          className="fill-ralla-600"
        />
      ))}
      <circle r={9} className="fill-ralla-50" />
    </svg>
  );
}
