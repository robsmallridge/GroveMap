import type { FileInfo } from "../types";
import { formatSize, formatDate } from "../utils";

interface Props {
  files: FileInfo[];
}

export default function FileList({ files }: Props) {
  if (files.length === 0) {
    return <p className="text-ink-3 text-sm">No files match these filters.</p>;
  }

  return (
    <div className="bg-surface border border-line rounded-[13px] overflow-hidden">
      <div className="grid grid-cols-[1fr_110px_90px_130px] gap-3 px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
        <span>Name</span>
        <span className="text-right">Size</span>
        <span>Type</span>
        <span className="text-right">Modified</span>
      </div>
      {files.map((file) => (
        <div
          key={file.path}
          title={file.path}
          className="grid grid-cols-[1fr_110px_90px_130px] gap-3 px-4 py-2.5 border-t border-line items-center text-[13.5px] hover:bg-surface-2 transition"
        >
          <span className="text-ink truncate">{file.name}</span>
          <span className="text-right font-mono text-[12.5px] text-ink-2">{formatSize(file.size)}</span>
          <span className="font-mono text-[12.5px] text-ink-3">{file.extension || "—"}</span>
          <span className="text-right text-ink-3">{formatDate(file.modified)}</span>
        </div>
      ))}
    </div>
  );
}
