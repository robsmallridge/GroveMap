/** GroveMap brand mark ("Plot") + wordmark. */

let _uid = 0;

export function PlotMark({ size = 30 }: { size?: number }) {
  const id = `gm-plot-${_uid++}`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="GroveMap">
      <defs>
        <clipPath id={id}>
          <rect x="8" y="8" width="84" height="84" rx="20" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect x="8" y="8" width="84" height="84" fill="oklch(0.26 0.012 167)" />
        <rect x="11" y="11" width="48" height="48" rx="3" fill="oklch(0.82 0.16 150)" />
        <rect x="62" y="11" width="27" height="29" rx="3" fill="oklch(0.72 0.15 168)" />
        <rect x="62" y="43" width="27" height="16" rx="3" fill="oklch(0.66 0.13 158)" />
        <rect x="11" y="62" width="30" height="27" rx="3" fill="oklch(0.74 0.14 188)" />
        <rect x="44" y="62" width="22" height="27" rx="3" fill="oklch(0.62 0.13 152)" />
        <rect x="69" y="62" width="20" height="27" rx="3" fill="oklch(0.55 0.10 178)" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-[-0.03em] leading-none ${className}`}>
      <span className="text-ink">Grove</span>
      <span className="text-accent">Map</span>
    </span>
  );
}
