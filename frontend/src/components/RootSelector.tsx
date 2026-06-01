import type { RootInfo } from "../types";
import { useTriggerScan } from "../api/client";
import { formatSize } from "../utils";

interface Props {
  roots: RootInfo[];
  onSelect: (path: string) => void;
}

export default function RootSelector({ roots, onSelect }: Props) {
  const scanMutation = useTriggerScan();

  if (roots.length === 0) {
    return (
      <div className="text-center py-24 text-ink-3">
        <p className="text-lg text-ink-2">No volumes mounted</p>
        <p className="text-sm mt-2 font-mono">
          Mount directories to <span className="text-ink">/data/</span> in the container
        </p>
      </div>
    );
  }

  const readySize = roots
    .filter((r) => r.state === "ready")
    .reduce((s, r) => s + (r.total_size ?? 0), 0);
  const maxSize = Math.max(1, ...roots.map((r) => r.total_size ?? 0));

  return (
    <div>
      <div className="mb-7 mt-4">
        <h1 className="text-3xl font-bold tracking-[-0.02em]">Volumes</h1>
        <p className="text-sm text-ink-3 font-mono mt-1.5">
          {roots.length} mounted · {formatSize(readySize)} scanned across ready volumes
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-[18px]">
        {roots.map((root) => {
          const ready = root.state === "ready";
          return (
            <div
              key={root.path}
              onClick={() => ready && onSelect(root.path)}
              className={`group bg-surface border border-line rounded-2xl p-5 transition ${
                ready
                  ? "cursor-pointer hover:border-accent-dim hover:bg-surface-2 hover:-translate-y-0.5"
                  : ""
              }`}
            >
              <div className="flex items-center gap-3 mb-[18px]">
                <span className="w-[42px] h-[42px] rounded-[11px] grid place-items-center flex-none bg-[oklch(0.30_0.05_156)] group-hover:bg-[var(--accent-glow)]">
                  <VolumeIcon />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-base">{root.name}</div>
                  <div className="font-mono text-[11px] text-ink-3 truncate">{root.path}</div>
                </div>
                {ready && (
                  <ChevronIcon className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition" />
                )}
              </div>

              {ready && (
                <>
                  <div className="text-[34px] font-bold tracking-[-0.025em] leading-none">
                    {formatSize(root.total_size ?? 0).split(" ")[0]}
                    <small className="text-base font-medium text-ink-3 ml-1.5">
                      {formatSize(root.total_size ?? 0).split(" ")[1]}
                    </small>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-3 my-3 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-[width] duration-500"
                      style={{ width: `${Math.max(8, Math.round(((root.total_size ?? 0) / maxSize) * 100))}%` }}
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[11.5px] text-ink-3">
                    <span>{root.total_files?.toLocaleString()} files</span>
                    <span>{root.total_dirs?.toLocaleString()} folders</span>
                    {root.scan_time != null && <span>{root.scan_time.toFixed(1)}s</span>}
                  </div>
                </>
              )}

              {root.state === "scanning" && (
                <div className="flex items-center gap-2.5 text-accent text-sm py-1.5">
                  <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  Scanning… <b className="font-mono text-ink">{root.files_scanned.toLocaleString()}</b> files
                </div>
              )}

              {root.state === "error" && (
                <div className="text-sm text-red-400">Error: {root.error}</div>
              )}

              {root.state === "idle" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    scanMutation.mutate(root.path);
                  }}
                  className="btn btn-primary mt-0.5"
                >
                  <RescanIcon /> Start scan
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VolumeIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" className="stroke-accent fill-none [stroke-width:1.7] [stroke-linecap:round] [stroke-linejoin:round]">
      <ellipse cx="12" cy="6" rx="7" ry="2.6" />
      <path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" />
      <path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" />
    </svg>
  );
}
function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" className={`stroke-ink-3 fill-none [stroke-width:1.8] [stroke-linecap:round] [stroke-linejoin:round] ${className}`}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
function RescanIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="fill-none [stroke:var(--accent-ink)] [stroke-width:1.9] [stroke-linecap:round] [stroke-linejoin:round]">
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 5v6h-6" />
    </svg>
  );
}
