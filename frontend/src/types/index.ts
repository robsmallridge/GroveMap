export interface TreeNode {
  name: string;
  path: string;
  size: number;
  file_count: number;
  dir_count: number;
  modified: number;
  is_dir: boolean;
  children?: TreeNode[];
  has_children?: boolean;
}

export interface RootInfo {
  name: string;
  path: string;
  state: "idle" | "scanning" | "ready" | "error";
  total_size: number | null;
  total_files: number | null;
  total_dirs: number | null;
  scan_time: number | null;
  files_scanned: number;
  error: string | null;
}

export interface TreeResponse {
  state: "ready" | "scanning";
  tree?: TreeNode;
  extensions?: Record<string, number>;
  files_scanned?: number;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  extension: string;
  modified: number;
}

export interface FilesResponse {
  total: number;
  total_size: number;
  files: FileInfo[];
}

export interface Filters {
  name: string;
  extension: string;
  minDate: string;
  maxDate: string;
}
