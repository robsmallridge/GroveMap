interface Props {
  state: "scanning" | "ready" | "idle" | "error";
  filesScanned: number;
  onRescan: () => void;
}

export default function ScanStatus({ state, filesScanned, onRescan }: Props) {
  if (state === "scanning") {
    return (
      <div className="flex items-center gap-2.5 bg-[var(--accent-glow)] border border-accent-dim rounded-[10px] px-3.5 py-2 text-sm text-accent">
        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        Scanning… {filesScanned.toLocaleString()} files
      </div>
    );
  }

  return (
    <button onClick={onRescan} className="btn btn-quiet">
      <svg width="16" height="16" viewBox="0 0 24 24" className="stroke-ink-3 fill-none [stroke-width:1.8] [stroke-linecap:round] [stroke-linejoin:round]">
        <path d="M20 11a8 8 0 1 0-2.3 5.7" />
        <path d="M20 5v6h-6" />
      </svg>
      Rescan
    </button>
  );
}
