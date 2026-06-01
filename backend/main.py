"""FastAPI backend for GroveMap."""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from cache import ScanCache, ScanState
from scanner import filter_files, get_subtree

DATA_ROOT = os.environ.get("DATA_ROOT", "/data")
SCAN_CACHE_TTL = int(os.environ.get("SCAN_CACHE_TTL", "300"))
SCAN_ON_START = os.environ.get("SCAN_ON_START", "true").lower() == "true"
STATIC_DIR = os.environ.get("STATIC_DIR", "/app/static")

cache = ScanCache(ttl=SCAN_CACHE_TTL)


def _discover_roots() -> list[dict]:
    """Discover mounted directories under DATA_ROOT."""
    roots = []
    if not os.path.isdir(DATA_ROOT):
        return roots
    for entry in sorted(os.scandir(DATA_ROOT), key=lambda e: e.name):
        if entry.is_dir(follow_symlinks=True):
            roots.append({"name": entry.name, "path": entry.path})
    # If no subdirectories, treat DATA_ROOT itself as the single root
    if not roots and os.path.isdir(DATA_ROOT):
        roots.append({"name": os.path.basename(DATA_ROOT) or "data", "path": DATA_ROOT})
    return roots


def _ensure_path_safe(path: str) -> None:
    """Ensure the requested path is under DATA_ROOT."""
    real = os.path.realpath(path)
    root_real = os.path.realpath(DATA_ROOT)
    if not (real == root_real or real.startswith(root_real + os.sep)):
        raise HTTPException(status_code=403, detail="Access denied: path outside data root")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if SCAN_ON_START:
        for root in _discover_roots():
            cache.scan_async(root["path"])
    yield


app = FastAPI(title="GroveMap", lifespan=lifespan)


@app.get("/api/roots")
async def get_roots():
    """List available scan roots with their status and size info."""
    roots = _discover_roots()
    result = []
    for root in roots:
        status = cache.get_status(root["path"])
        entry = cache.get(root["path"])
        info = {
            **root,
            **status,
            "total_size": entry.result.total_size if entry and entry.result else None,
            "total_files": entry.result.total_files if entry and entry.result else None,
            "total_dirs": entry.result.total_dirs if entry and entry.result else None,
            "scan_time": entry.result.scan_time if entry and entry.result else None,
        }
        result.append(info)
    return result


@app.get("/api/tree")
async def get_tree(
    root: str = Query(..., description="Root path to get tree for"),
    depth: int = Query(3, description="Depth limit for tree response"),
    path: str | None = Query(None, description="Subtree path to drill into"),
    dirs_only: bool = Query(True, description="Only return directories in tree"),
):
    """Get the directory tree with sizes."""
    _ensure_path_safe(root)
    if path:
        _ensure_path_safe(path)

    entry = cache.get(root)
    if entry is None or entry.result is None:
        if entry and entry.state == ScanState.SCANNING:
            return {"state": "scanning", "files_scanned": entry.files_scanned}
        # Trigger a scan
        cache.scan_async(root)
        return {"state": "scanning", "files_scanned": 0}

    tree = entry.result.tree
    if path:
        subtree = get_subtree(tree, path)
        if subtree is None:
            raise HTTPException(status_code=404, detail="Path not found in scan")
        tree = subtree

    tree_dict = tree.to_dict(depth=depth)

    if dirs_only:
        _strip_files(tree_dict)

    return {
        "state": "ready",
        "tree": tree_dict,
        "extensions": entry.result.extensions,
    }


def _strip_files(node: dict) -> None:
    """Remove non-directory children from tree dict (in place)."""
    if "children" in node:
        node["children"] = [c for c in node["children"] if c.get("is_dir", False)]
        for child in node["children"]:
            _strip_files(child)


@app.get("/api/files")
async def get_files(
    root: str = Query(..., description="Root path"),
    name: str | None = Query(None, description="Filter by filename substring"),
    extension: str | None = Query(None, description="Filter by extension (e.g. .mkv)"),
    min_date: float | None = Query(None, description="Min modified timestamp"),
    max_date: float | None = Query(None, description="Max modified timestamp"),
    min_size: int | None = Query(None, description="Min file size in bytes"),
    max_size: int | None = Query(None, description="Max file size in bytes"),
    sort_by: str = Query("size", description="Sort field: size, name, modified"),
    sort_desc: bool = Query(True, description="Sort descending"),
    limit: int = Query(100, description="Max results"),
    offset: int = Query(0, description="Result offset for pagination"),
):
    """Get filtered file listing."""
    _ensure_path_safe(root)

    entry = cache.get(root)
    if entry is None or entry.result is None:
        raise HTTPException(status_code=404, detail="No scan data available. Trigger a scan first.")

    filtered = filter_files(
        entry.result.files,
        name=name,
        extension=extension,
        min_date=min_date,
        max_date=max_date,
        min_size=min_size,
        max_size=max_size,
    )

    # Sort
    sort_key = {"size": lambda f: f.size, "name": lambda f: f.name.lower(), "modified": lambda f: f.modified}
    filtered.sort(key=sort_key.get(sort_by, sort_key["size"]), reverse=sort_desc)

    total = len(filtered)
    page = filtered[offset : offset + limit]

    return {
        "total": total,
        "total_size": sum(f.size for f in filtered),
        "files": [f.to_dict() for f in page],
    }


@app.post("/api/scan")
async def trigger_scan(root: str = Query(..., description="Root path to scan")):
    """Trigger a rescan of the given root."""
    _ensure_path_safe(root)
    cache.invalidate(root)
    cache.scan_async(root)
    return {"state": "scanning"}


@app.get("/api/status")
async def get_status():
    """Get scan status for all roots."""
    return cache.all_statuses()


# Serve frontend static files
assets_dir = os.path.join(STATIC_DIR, "assets")
if os.path.isdir(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve the React SPA for all non-API routes."""
    index = os.path.join(STATIC_DIR, "index.html")
    if not os.path.isfile(index):
        return {"error": "Frontend not built. Run 'npm run build' in frontend/"}
    file_path = os.path.join(STATIC_DIR, full_path)
    if full_path and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(index)
