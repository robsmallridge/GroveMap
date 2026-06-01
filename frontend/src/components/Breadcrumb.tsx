interface Props {
  path: string[];
  rootPath: string;
  onNavigate: (index: number) => void;
}

export default function Breadcrumb({ path, rootPath, onNavigate }: Props) {
  const rootName = rootPath.split("/").pop() || rootPath;
  const parts = [rootName, ...path];

  return (
    <nav className="flex items-center gap-0.5 text-[15px] overflow-x-auto">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-0.5 whitespace-nowrap">
          {i > 0 && (
            <svg width="16" height="16" viewBox="0 0 24 24" className="text-ink-3 opacity-60 fill-none [stroke:currentColor] [stroke-width:1.8] [stroke-linecap:round] [stroke-linejoin:round]">
              <path d="m9 6 6 6-6 6" />
            </svg>
          )}
          {i < parts.length - 1 ? (
            <button
              onClick={() => onNavigate(i)}
              className="text-accent font-medium px-1 py-0.5 rounded-md hover:bg-surface-2 transition"
            >
              {part}
            </button>
          ) : (
            <span className="text-ink font-semibold px-1 py-0.5">{part}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
