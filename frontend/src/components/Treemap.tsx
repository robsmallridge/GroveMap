import { useMemo, useRef } from "react";
import { hierarchy, treemap, treemapSquarify, type HierarchyRectangularNode } from "d3-hierarchy";
import type { TreeNode } from "../types";
import { formatSize, getColor } from "../utils";

interface Props {
  data: TreeNode;
  width: number;
  height: number;
  onDrillDown: (node: TreeNode) => void;
}

const HEADER_H = 30;
const PAD_TOP = HEADER_H + 5;
const GAP = 4;

export default function Treemap({ data, width, height, onDrillDown }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  const layout = useMemo(() => {
    const root = hierarchy(data)
      .sum((d) => (!d.children?.length ? d.size : 0))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    return treemap<TreeNode>()
      .size([width, height])
      .paddingInner(GAP)
      .paddingOuter(GAP)
      .paddingTop(PAD_TOP)
      .round(true)
      .tile(treemapSquarify.ratio(1.4))(root);
  }, [data, width, height]);

  const colorByDepth1 = useMemo(() => {
    const m = new Map<HierarchyRectangularNode<TreeNode>, string>();
    (layout.children ?? []).forEach((n, i) => m.set(n, getColor(i)));
    return m;
  }, [layout]);

  const colorOf = (node: HierarchyRectangularNode<TreeNode>): string => {
    const a = node.ancestors().find((d) => d.depth === 1) as HierarchyRectangularNode<TreeNode> | undefined;
    return (a && colorByDepth1.get(a)) || getColor(0);
  };

  const depth1 = layout.descendants().filter((d) => d.depth === 1);
  const depth2 = layout.descendants().filter((d) => d.depth === 2);

  return (
    <svg ref={svgRef} width={width} height={height} className="select-none block w-full">

      {/* Layer 1: Depth-1 container frames — dark background with subtle colored border */}
      {depth1.map((node) => {
        const w = node.x1 - node.x0;
        const h = node.y1 - node.y0;
        if (w < 2 || h < 2) return null;
        const color = colorOf(node);
        const hasChildren = (node.children?.length ?? 0) > 0;

        return (
          <g key={`frame-${node.data.path}`}>
            {/* Dark container background */}
            <rect
              x={node.x0} y={node.y0}
              width={w} height={h}
              rx={8}
              fill="oklch(0.175 0.008 165)"
              stroke={color}
              strokeOpacity={0.4}
              strokeWidth={1.2}
              onClick={(e) => {
                e.stopPropagation();
                if (node.data.is_dir) onDrillDown(node.data);
              }}
              className={node.data.is_dir ? "cursor-pointer" : ""}
            />
            {/* If no children, fill with the color instead */}
            {!hasChildren && (
              <rect
                x={node.x0} y={node.y0}
                width={w} height={h}
                rx={8}
                fill={color}
                fillOpacity={0.7}
                stroke={color}
                strokeOpacity={0.4}
                strokeWidth={1.2}
                onClick={(e) => {
                  e.stopPropagation();
                  if (node.data.is_dir) onDrillDown(node.data);
                }}
                className={node.data.is_dir ? "cursor-pointer" : ""}
              />
            )}
          </g>
        );
      })}

      {/* Layer 2: Depth-2 child cells — solid colored blocks */}
      {depth2.map((node) => {
        const w = node.x1 - node.x0;
        const h = node.y1 - node.y0;
        if (w < 2 || h < 2) return null;
        const color = colorOf(node);
        const isFolder = node.data.is_dir;

        return (
          <g
            key={node.data.path}
            transform={`translate(${node.x0},${node.y0})`}
            onClick={(e) => {
              e.stopPropagation();
              if (isFolder) onDrillDown(node.data);
            }}
            className={isFolder ? "cursor-pointer" : ""}
          >
            <rect
              width={w} height={h}
              rx={5}
              fill={color}
              fillOpacity={0.82}
            />
            {w > 50 && h > 20 && (
              <text
                x={8} y={18}
                fontFamily='"Plus Jakarta Sans", system-ui, sans-serif'
                fontSize={13} fontWeight={600}
                fill="oklch(0.16 0.02 160)"
              >
                {truncate(node.data.name, w - 16, 13)}
              </text>
            )}
            {w > 65 && h > 38 && (
              <text
                x={8} y={34}
                fontFamily='"JetBrains Mono", monospace'
                fontSize={11} fontWeight={500}
                fill="oklch(0.22 0.02 160 / 0.7)"
              >
                {formatSize(node.data.size)}
              </text>
            )}
            <title>
              {node.data.name}{"\n"}{formatSize(node.data.size)}
              {isFolder ? `\n${node.data.file_count.toLocaleString()} files` : ""}
            </title>
          </g>
        );
      })}

      {/* Layer 3: Depth-1 header bars — solid dark, always on top */}
      {depth1.map((node) => {
        const w = node.x1 - node.x0;
        const h = node.y1 - node.y0;
        if (w < 30 || h < HEADER_H) return null;
        const color = colorOf(node);

        return (
          <g
            key={`hdr-${node.data.path}`}
            transform={`translate(${node.x0},${node.y0})`}
            onClick={(e) => {
              e.stopPropagation();
              if (node.data.is_dir) onDrillDown(node.data);
            }}
            className={node.data.is_dir ? "cursor-pointer" : ""}
          >
            {/* Solid dark header background */}
            <rect
              x={1} y={1}
              width={w - 2} height={HEADER_H}
              rx={7}
              fill="oklch(0.16 0.008 165)"
            />
            {/* Small colored swatch */}
            {w > 60 && (
              <rect
                x={10} y={9} width={12} height={12}
                rx={3} fill={color}
              />
            )}
            {/* Folder name */}
            {w > 60 && (
              <text
                x={28} y={21}
                fontFamily='"Plus Jakarta Sans", system-ui, sans-serif'
                fontSize={14} fontWeight={700}
                fill="oklch(0.95 0.004 165)"
              >
                {truncate(node.data.name, w > 200 ? w - 115 : w - 36, 14)}
              </text>
            )}
            {w <= 60 && w > 30 && (
              <text
                x={6} y={20}
                fontFamily='"Plus Jakarta Sans", system-ui, sans-serif'
                fontSize={11} fontWeight={600}
                fill="oklch(0.90 0.004 165)"
              >
                {truncate(node.data.name, w - 12, 11)}
              </text>
            )}
            {/* Size on the right */}
            {w > 180 && (
              <text
                x={w - 12} y={21}
                fontFamily='"JetBrains Mono", monospace'
                fontSize={12} fontWeight={500}
                fill="oklch(0.62 0.008 165)"
                textAnchor="end"
              >
                {formatSize(node.data.size)}
              </text>
            )}
            <title>
              {node.data.name}{"\n"}{formatSize(node.data.size)}
              {node.data.is_dir ? `\n${node.data.file_count.toLocaleString()} files` : ""}
            </title>
          </g>
        );
      })}
    </svg>
  );
}

function truncate(text: string, maxWidth: number, fontSize: number): string {
  const charWidth = fontSize * 0.58;
  const max = Math.floor(maxWidth / charWidth);
  if (text.length <= max) return text;
  return text.slice(0, Math.max(max - 1, 1)) + "\u2026";
}
