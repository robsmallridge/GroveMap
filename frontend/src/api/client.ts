import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { RootInfo, TreeResponse, FilesResponse, Filters } from "../types";

const BASE = "/api";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function useRoots() {
  return useQuery<RootInfo[]>({
    queryKey: ["roots"],
    queryFn: () => fetchJson(`${BASE}/roots`),
    refetchInterval: 5000,
  });
}

export function useTree(root: string | null, path?: string, depth = 3) {
  const params = new URLSearchParams();
  if (root) params.set("root", root);
  if (path) params.set("path", path);
  params.set("depth", String(depth));
  params.set("dirs_only", "false");

  return useQuery<TreeResponse>({
    queryKey: ["tree", root, path, depth],
    queryFn: () => fetchJson(`${BASE}/tree?${params}`),
    enabled: !!root,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.state === "scanning" ? 2000 : false;
    },
  });
}

export function useFiles(root: string | null, filters: Filters) {
  const params = new URLSearchParams();
  if (root) params.set("root", root);
  if (filters.name) params.set("name", filters.name);
  if (filters.extension) params.set("extension", filters.extension);
  if (filters.minDate) params.set("min_date", String(new Date(filters.minDate).getTime() / 1000));
  if (filters.maxDate) params.set("max_date", String(new Date(filters.maxDate).getTime() / 1000));
  params.set("limit", "200");

  return useQuery<FilesResponse>({
    queryKey: ["files", root, filters],
    queryFn: () => fetchJson(`${BASE}/files?${params}`),
    enabled: !!root && !!(filters.name || filters.extension || filters.minDate || filters.maxDate),
  });
}

export function useTriggerScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (root: string) =>
      fetch(`${BASE}/scan?root=${encodeURIComponent(root)}`, { method: "POST" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roots"] });
      qc.invalidateQueries({ queryKey: ["tree"] });
    },
  });
}
