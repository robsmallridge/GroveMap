import { useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TreeNode } from "../types";
import { fetchSubtree } from "../api/client";
import { formatSize, formatDate } from "../utils";

type SortKey = "name" | "pct" | "size" | "modified";
type SortDir = "asc" | "desc";

interface Props {
  rootPath: string;
  tree: TreeNode;
  onDrillDown: (node: TreeNode) => void;
}

interface Row {
  node: TreeNode;
  depth: number;
  parentSize: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isLoading: boolean;
}

export default function TreeListView({ rootPath, tree, onDrillDown }: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([tree.path]));
  const [extra, setExtra] = useState<Map<string, TreeNode>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>("size");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const getChildren = useCallback(
    (node: TreeNode): TreeNode[] | undefined => {
      const fromExtra = extra.get(node.path);
      if (fromExtra?.children) return fromExtra.children;
      return node.children;
    },
    [extra]
  );

  const hasChildren = useCallback(
    (node: TreeNode): boolean => {
      if (!node.is_dir) return false;
      const kids = getChildren(node);
      if (kids && kids.length > 0) return true;
      return !!node.has_children;
    },
    [getChildren]
  );

  const expand = useCallback(
    async (node: TreeNode) => {
      const path = node.path;
      const isOpen = expanded.has(path);
      setExpanded((prev) => {
        const next = new Set(prev);
        if (isOpen) next.delete(path);
        else next.add(path);
        return next;
      });
      if (isOpen) return;
      const haveChildren = !!getChildren(node);
      if (!haveChildren && node.has_children && !loading.has(path)) {
        setLoading((prev) => new Set(prev).add(path));
        try {
          const sub = await fetchSubtree(qc, rootPath, path, 3);
          if (sub) setExtra((prev) => new Map(prev).set(path, sub));
        } finally {
          setLoading((prev) => {
            const next = new Set(prev);
            next.delete(path);
            return next;
          });
        }
      }
    },
    [expanded, getChildren, loading, qc, rootPath]
  );

  const compare = useCallback(
    (a: TreeNode, b: TreeNode, parentSize: number): number => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortBy) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "pct":
        case "size":
          return dir * (a.size - b.size);
        case "modified":
          return dir * (a.modified - b.modified);
      }
      void parentSize;
      return 0;
    },
    [sortBy, sortDir]
  );

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const walk = (node: TreeNode, depth: number, parentSize: number) => {
      const isOpen = expanded.has(node.path);
      out.push({
        node,
        depth,
        parentSize,
        hasChildren: hasChildren(node),
        isExpanded: isOpen,
        isLoading: loading.has(node.path),
      });
      if (!isOpen) return;
      const kids = getChildren(node);
      if (!kids) return;
      const sorted = [...kids].sort((a, b) => compare(a, b, node.size));
      for (const child of sorted) walk(child, depth + 1, node.size);
    };
    walk(tree, 0, tree.size || 1);
    return out;
  }, [tree, expanded, getChildren, hasChildren, loading, compare]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  return (
    <div className="bg-surface border border-line rounded-[13px] overflow-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_180px_90px_130px] gap-3 px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-3 bg-surface-2 border-b border-line">
        <HeaderCell label="Name" sortKey="name" active={sortBy} dir={sortDir} onClick={toggleSort} />
        <HeaderCell label="% of parent" sortKey="pct" active={sortBy} dir={sortDir} onClick={toggleSort} align="left" />
        <HeaderCell label="Size" sortKey="size" active={sortBy} dir={sortDir} onClick={toggleSort} align="right" />
        <HeaderCell label="Modified" sortKey="modified" active={sortBy} dir={sortDir} onClick={toggleSort} align="right" />
      </div>
      <div className="max-h-[calc(100vh-300px)] overflow-auto">
        {rows.map((row) => (
          <TreeRow key={row.node.path} row={row} onToggle={expand} onDrillDown={onDrillDown} />
        ))}
      </div>
    </div>
  );
}

function HeaderCell({
  label,
  sortKey,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = active === sortKey;
  return (
    <button
      onClick={() => onClick(sortKey)}
      className={
        "inline-flex items-center gap-1 hover:text-ink-2 transition " +
        (align === "right" ? "justify-end text-right" : "justify-start text-left") +
        (isActive ? " text-ink-2" : "")
      }
    >
      {label}
      {isActive && <span className="text-[9px]">{dir === "asc" ? "▲" : "▼"}</span>}
    </button>
  );
}

function TreeRow({
  row,
  onToggle,
  onDrillDown,
}: {
  row: Row;
  onToggle: (node: TreeNode) => void;
  onDrillDown: (node: TreeNode) => void;
}) {
  const { node, depth, parentSize, hasChildren, isExpanded, isLoading } = row;
  const pct = parentSize > 0 ? (node.size / parentSize) * 100 : 0;
  const indent = depth * 18;

  const handleClick = () => {
    if (hasChildren) onToggle(node);
  };
  const handleDoubleClick = () => {
    if (node.is_dir) onDrillDown(node);
  };

  return (
    <div
      title={node.path}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={
        "grid grid-cols-[minmax(0,1fr)_180px_90px_130px] gap-3 px-4 py-2 border-t border-line items-center text-[13.5px] transition " +
        (hasChildren ? "cursor-pointer " : "") +
        "hover:bg-surface-2"
      }
    >
      <div className="flex items-center min-w-0" style={{ paddingLeft: indent }}>
        <span className="w-4 inline-flex items-center justify-center text-ink-3 mr-1 shrink-0">
          {hasChildren ? (
            isLoading ? (
              <span className="w-3 h-3 border-[1.5px] border-ink-3 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Chevron open={isExpanded} />
            )
          ) : null}
        </span>
        <span className="mr-2 shrink-0">{node.is_dir ? <FolderIcon /> : <FileIcon />}</span>
        <span className="text-ink truncate">{node.name}</span>
      </div>

      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex-1 h-2 rounded-full bg-bg-2 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(100, pct)}%`, background: "var(--accent)" }}
          />
        </div>
        <span className="font-mono text-[11.5px] text-ink-3 w-10 text-right tabular-nums">
          {pct < 0.1 ? "—" : `${pct.toFixed(1)}%`}
        </span>
      </div>

      <span className="text-right font-mono text-[12.5px] text-ink-2 tabular-nums">{formatSize(node.size)}</span>
      <span className="text-right font-mono text-[12px] text-ink-3 tabular-nums">{formatDate(node.modified)}</span>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      className="fill-current transition-transform"
      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
    >
      <path d="M8 5l8 7-8 7z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="fill-accent/80">
      <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6c.4 0 .78.16 1.06.44L11.5 6.5h8A1.5 1.5 0 0 1 21 8v9.5A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-11z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="fill-none stroke-ink-3 [stroke-width:1.6] [stroke-linejoin:round]">
      <path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V3.5z" />
      <path d="M14 3.5V7.5h4" />
    </svg>
  );
}
