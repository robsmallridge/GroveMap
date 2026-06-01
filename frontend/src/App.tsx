import { useState } from "react";
import { useRoots } from "./api/client";
import RootSelector from "./components/RootSelector";
import TreemapView from "./components/TreemapView";
import { PlotMark, Wordmark } from "./components/Logo";

export default function App() {
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null);
  const { data: roots } = useRoots();

  const current = roots?.find((r) => r.path === selectedRoot);

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 flex items-center justify-between px-7 py-3.5 border-b border-line bg-[oklch(0.18_0.009_165/0.85)] backdrop-blur-md">
        <button
          onClick={() => setSelectedRoot(null)}
          className="flex items-center gap-3"
          aria-label="Home"
        >
          <PlotMark size={30} />
          <Wordmark className="text-[21px]" />
        </button>

        {current ? (
          <button
            onClick={() => setSelectedRoot(null)}
            className="text-sm text-ink-3 hover:text-ink transition font-medium"
          >
            ← Back to volumes
          </button>
        ) : (
          <span className="font-mono text-xs text-ink-3">Disk usage, mapped.</span>
        )}
      </header>

      <main className={`px-7 py-7 pb-20 ${!selectedRoot ? "max-w-[1240px] mx-auto" : ""}`}>
        {!selectedRoot ? (
          <RootSelector roots={roots ?? []} onSelect={(path) => setSelectedRoot(path)} />
        ) : (
          <TreemapView rootPath={selectedRoot} />
        )}
      </main>
    </div>
  );
}
