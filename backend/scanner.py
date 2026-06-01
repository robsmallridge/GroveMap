"""Directory tree scanner using os.scandir for efficient file system traversal."""

import os
import time
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class FileInfo:
    name: str
    path: str
    size: int
    extension: str
    modified: float

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "path": self.path,
            "size": self.size,
            "extension": self.extension,
            "modified": self.modified,
        }


@dataclass
class TreeNode:
    name: str
    path: str
    size: int = 0
    file_count: int = 0
    dir_count: int = 0
    modified: float = 0.0
    children: list["TreeNode"] = field(default_factory=list)
    is_dir: bool = True

    def to_dict(self, depth: int = -1) -> dict:
        result = {
            "name": self.name,
            "path": self.path,
            "size": self.size,
            "file_count": self.file_count,
            "dir_count": self.dir_count,
            "modified": self.modified,
            "is_dir": self.is_dir,
        }
        if self.is_dir and depth != 0:
            result["children"] = [
                child.to_dict(depth=depth - 1 if depth > 0 else -1)
                for child in sorted(self.children, key=lambda c: c.size, reverse=True)
            ]
        elif self.is_dir:
            result["children"] = []
            result["has_children"] = len(self.children) > 0
        return result


@dataclass
class ScanResult:
    tree: TreeNode
    files: list[FileInfo]
    scan_time: float
    total_size: int
    total_files: int
    total_dirs: int
    extensions: dict[str, int]  # extension -> count


def scan_directory(root_path: str, progress_callback=None) -> ScanResult:
    """Scan a directory tree and return the full tree structure plus flat file list."""
    all_files: list[FileInfo] = []
    extensions: dict[str, int] = {}
    start_time = time.time()

    def _scan(path: str) -> TreeNode:
        node = TreeNode(name=os.path.basename(path) or path, path=path)
        try:
            entries = list(os.scandir(path))
        except PermissionError:
            return node
        except OSError:
            return node

        for entry in entries:
            try:
                if entry.is_dir(follow_symlinks=False):
                    child = _scan(entry.path)
                    node.children.append(child)
                    node.size += child.size
                    node.file_count += child.file_count
                    node.dir_count += 1 + child.dir_count
                    if child.modified > node.modified:
                        node.modified = child.modified
                elif entry.is_file(follow_symlinks=False):
                    stat = entry.stat(follow_symlinks=False)
                    ext = os.path.splitext(entry.name)[1].lower()
                    file_info = FileInfo(
                        name=entry.name,
                        path=entry.path,
                        size=stat.st_size,
                        extension=ext,
                        modified=stat.st_mtime,
                    )
                    all_files.append(file_info)
                    extensions[ext] = extensions.get(ext, 0) + 1

                    child_node = TreeNode(
                        name=entry.name,
                        path=entry.path,
                        size=stat.st_size,
                        modified=stat.st_mtime,
                        is_dir=False,
                    )
                    node.children.append(child_node)
                    node.size += stat.st_size
                    node.file_count += 1
                    if stat.st_mtime > node.modified:
                        node.modified = stat.st_mtime
            except (PermissionError, OSError):
                continue

        if progress_callback:
            progress_callback(node.file_count)

        return node

    tree = _scan(root_path)
    scan_time = time.time() - start_time

    return ScanResult(
        tree=tree,
        files=all_files,
        scan_time=scan_time,
        total_size=tree.size,
        total_files=tree.file_count,
        total_dirs=tree.dir_count,
        extensions=dict(sorted(extensions.items(), key=lambda x: x[1], reverse=True)),
    )


def get_subtree(tree: TreeNode, path: str) -> TreeNode | None:
    """Find a subtree node by path."""
    if tree.path == path:
        return tree
    for child in tree.children:
        if child.is_dir:
            if path.startswith(child.path):
                result = get_subtree(child, path)
                if result:
                    return result
    return None


def filter_files(
    files: list[FileInfo],
    name: str | None = None,
    extension: str | None = None,
    min_date: float | None = None,
    max_date: float | None = None,
    min_size: int | None = None,
    max_size: int | None = None,
) -> list[FileInfo]:
    """Filter the flat file list by various criteria."""
    result = files
    if name:
        name_lower = name.lower()
        result = [f for f in result if name_lower in f.name.lower()]
    if extension:
        ext = extension.lower() if extension.startswith(".") else f".{extension.lower()}"
        result = [f for f in result if f.extension == ext]
    if min_date is not None:
        result = [f for f in result if f.modified >= min_date]
    if max_date is not None:
        result = [f for f in result if f.modified <= max_date]
    if min_size is not None:
        result = [f for f in result if f.size >= min_size]
    if max_size is not None:
        result = [f for f in result if f.size <= max_size]
    return result
