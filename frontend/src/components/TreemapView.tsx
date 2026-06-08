import { useState, useRef, useEffect, useCallback } from "react";
import { useTree, useFiles, useTriggerScan } from "../api/client";
import type { TreeNode, Filters } from "../types";
import Treemap from "./Treemap";
import TreeListView from "./TreeListView";
import ViewToggle, { type ViewMode } from "./ViewToggle";
import Breadcrumb from "./Breadcrumb";
import FilterPanel from "./FilterPanel";
import ScanStatus from "./ScanStatus";
import FileList from "./FileList";
import { formatSize } from "../utils";

interface Props {
  rootPath: string;
}

export default function TreemapView({ rootPath }: Props) {
  const [drillPath, setDrillPath] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({ name: "", extension: "", minDate: "", maxDate: "" });
  const [viewMode, setViewMode] = useState<ViewMode>("treemap");
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 560 });

  const currentPath = drillPath.length > 0 ? drillPath[drillPath.length - 1] : undefined;

  const { data: treeData } = useTree(rootPath, currentPath, 3);
  const { data: filesData } = useFiles(rootPath, filters);
  const scanMutation = useTriggerScan();

  const hasActiveFilters = !!(filters.name || filters.extension || filters.minDate || filters.maxDate);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: Math.floor(entry.contentRect.width),
          height: Math.max(440, Math.floor(window.innerHeight - 240)),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleDrillDown = useCallback((node: TreeNode) => {
    setDrillPath((prev) => [...prev, node.path]);
  }, []);

  const handleBreadcrumbNav = useCallback((index: number) => {
    setDrillPath((prev) => (index === 0 ? [] : prev.slice(0, index)));
  }, []);

  const pathNames = drillPath.map((p) => p.split("/").pop() || p);
  const scanning = treeData?.state === "scanning";

  const isTreemap = viewMode === "treemap";

  return (
    <div className={"grid grid-cols-1 gap-[22px] items-start " + (isTreemap ? "lg:grid-cols-[1fr_256px]" : "")}>
      <div className="min-w-0" ref={containerRef}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <Breadcrumb path={pathNames} rootPath={rootPath} onNavigate={handleBreadcrumbNav} />
          <div className="flex items-center gap-2.5">
            <ViewToggle mode={viewMode} onChange={setViewMode} />
            <ScanStatus
              state={scanning ? "scanning" : "ready"}
              filesScanned={treeData?.files_scanned ?? 0}
              onRescan={() => scanMutation.mutate(rootPath)}
            />
          </div>
        </div>

        {treeData?.tree && (
          <>
            <div className="flex gap-8 px-5 py-4 bg-surface border border-line rounded-[13px] mb-4">
              <Stat label="Total" value={formatSize(treeData.tree.size)} accent />
              <Stat label="Files" value={treeData.tree.file_count.toLocaleString()} />
              <Stat label="Folders" value={treeData.tree.dir_count.toLocaleString()} />
              <Stat label="Items here" value={(treeData.tree.children?.length ?? 0).toString()} />
            </div>

            {isTreemap ? (
              <div className="relative bg-surface border border-line rounded-xl overflow-hidden p-1.5">
                <Treemap
                  data={treeData.tree}
                  width={dimensions.width - 12}
                  height={dimensions.height}
                  onDrillDown={handleDrillDown}
                />
              </div>
            ) : (
              <TreeListView rootPath={rootPath} tree={treeData.tree} onDrillDown={handleDrillDown} />
            )}
          </>
        )}

        {scanning && (
          <div className="flex items-center justify-center h-64 text-ink-2">
            <div className="text-center">
              <div className="w-8 h-8 border-[3px] border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p>Scanning directory…</p>
              <p className="text-sm text-ink-3 font-mono mt-1">
                {treeData?.files_scanned?.toLocaleString() ?? 0} files found
              </p>
            </div>
          </div>
        )}

        {hasActiveFilters && filesData && (
          <div className="mt-[22px]">
            <h3 className="text-base font-semibold mb-3">
              {filesData.total.toLocaleString()} matching files{" "}
              <span className="text-ink-3 font-normal">· {formatSize(filesData.total_size)}</span>
            </h3>
            <FileList files={filesData.files} />
          </div>
        )}
      </div>

      {isTreemap && (
        <FilterPanel filters={filters} onChange={setFilters} extensions={treeData?.extensions ?? {}} />
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.07em] text-ink-3 mb-1">{label}</div>
      <div className={`font-semibold tracking-[-0.01em] ${accent ? "text-[22px] text-accent" : "text-lg"}`}>
        {value}
      </div>
    </div>
  );
}
