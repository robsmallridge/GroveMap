export type ViewMode = "treemap" | "tree";

interface Props {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export default function ViewToggle({ mode, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 bg-surface-2 border border-line rounded-[10px]">
      <ToggleButton active={mode === "treemap"} onClick={() => onChange("treemap")}>
        <svg width="14" height="14" viewBox="0 0 24 24" className="fill-current opacity-80">
          <rect x="3" y="3" width="11" height="13" rx="1.5" />
          <rect x="15" y="3" width="6" height="7" rx="1.5" />
          <rect x="15" y="11" width="6" height="10" rx="1.5" />
          <rect x="3" y="17" width="11" height="4" rx="1.5" />
        </svg>
        Treemap
      </ToggleButton>
      <ToggleButton active={mode === "tree"} onClick={() => onChange("tree")}>
        <svg width="14" height="14" viewBox="0 0 24 24" className="stroke-current fill-none [stroke-width:1.8] [stroke-linecap:round] [stroke-linejoin:round]">
          <path d="M4 6h16M8 12h12M12 18h8" />
        </svg>
        Tree
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] text-[12.5px] font-semibold transition " +
        (active ? "bg-surface text-ink shadow-[0_1px_0_oklch(0_0_0/0.2)]" : "text-ink-3 hover:text-ink-2")
      }
    >
      {children}
    </button>
  );
}
