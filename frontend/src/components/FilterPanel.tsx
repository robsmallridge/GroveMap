import type { Filters } from "../types";

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  extensions: Record<string, number>;
}

export default function FilterPanel({ filters, onChange, extensions }: Props) {
  const topExtensions = Object.entries(extensions).slice(0, 20);
  const active = filters.name || filters.extension || filters.minDate || filters.maxDate;

  const fieldClass =
    "w-full bg-bg-2 border border-line-2 rounded-[9px] px-2.5 py-2 text-[13.5px] text-ink placeholder-ink-3 focus:outline-none focus:border-accent";

  return (
    <aside className="bg-surface border border-line rounded-xl p-[18px] flex flex-col gap-4 lg:sticky lg:top-[86px]">
      <div className="flex items-center gap-2 font-semibold text-[13px] uppercase tracking-[0.07em] text-ink-2">
        <svg width="15" height="15" viewBox="0 0 24 24" className="stroke-ink-3 fill-none [stroke-width:1.8] [stroke-linecap:round] [stroke-linejoin:round]">
          <path d="M4 5h16l-6 7v6l-4 2v-8z" />
        </svg>
        Filters
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-3">File name</span>
        <div className="relative flex items-center">
          <svg width="14" height="14" viewBox="0 0 24 24" className="absolute left-2.5 pointer-events-none stroke-ink-3 fill-none [stroke-width:1.8] [stroke-linecap:round] [stroke-linejoin:round]">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            type="text"
            value={filters.name}
            onChange={(e) => onChange({ ...filters, name: e.target.value })}
            placeholder="Search files…"
            className={`${fieldClass} pl-8`}
          />
        </div>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-3">Extension</span>
        <select
          value={filters.extension}
          onChange={(e) => onChange({ ...filters, extension: e.target.value })}
          className={fieldClass}
        >
          <option value="">All extensions</option>
          {topExtensions.map(([ext, count]) => (
            <option key={ext} value={ext}>
              {ext || "(no extension)"} ({count.toLocaleString()})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-3">Modified after</span>
        <input
          type="date"
          value={filters.minDate}
          onChange={(e) => onChange({ ...filters, minDate: e.target.value })}
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-3">Modified before</span>
        <input
          type="date"
          value={filters.maxDate}
          onChange={(e) => onChange({ ...filters, maxDate: e.target.value })}
          className={fieldClass}
        />
      </label>

      {active && (
        <button
          onClick={() => onChange({ name: "", extension: "", minDate: "", maxDate: "" })}
          className="flex items-center gap-1.5 text-[12.5px] text-ink-3 hover:text-ink transition self-start"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" className="fill-none [stroke:currentColor] [stroke-width:1.8] [stroke-linecap:round] [stroke-linejoin:round]">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
          Clear filters
        </button>
      )}

      <p className="text-[11.5px] text-ink-3 leading-relaxed pt-3.5 border-t border-line">
        Filtering reads cached scan results — instant, no rescan needed.
      </p>
    </aside>
  );
}
