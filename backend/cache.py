"""In-memory cache for scan results with TTL expiry."""

import threading
import time
from dataclasses import dataclass
from enum import Enum

from scanner import ScanResult, scan_directory


class ScanState(str, Enum):
    IDLE = "idle"
    SCANNING = "scanning"
    READY = "ready"
    ERROR = "error"


@dataclass
class CacheEntry:
    result: ScanResult | None
    timestamp: float
    state: ScanState
    error: str | None = None
    files_scanned: int = 0


class ScanCache:
    def __init__(self, ttl: int = 300):
        self.ttl = ttl
        self._cache: dict[str, CacheEntry] = {}
        self._lock = threading.Lock()

    def get(self, root: str) -> CacheEntry | None:
        with self._lock:
            entry = self._cache.get(root)
            if entry is None:
                return None
            if entry.state == ScanState.READY and (time.time() - entry.timestamp) > self.ttl:
                return None
            return entry

    def get_status(self, root: str) -> dict:
        entry = self.get(root)
        if entry is None:
            return {"state": ScanState.IDLE, "files_scanned": 0}
        return {
            "state": entry.state,
            "files_scanned": entry.files_scanned,
            "error": entry.error,
        }

    def scan_async(self, root: str) -> None:
        """Start a background scan for the given root."""
        with self._lock:
            entry = self._cache.get(root)
            if entry and entry.state == ScanState.SCANNING:
                return  # Already scanning

            self._cache[root] = CacheEntry(
                result=None,
                timestamp=time.time(),
                state=ScanState.SCANNING,
            )

        thread = threading.Thread(target=self._do_scan, args=(root,), daemon=True)
        thread.start()

    def _do_scan(self, root: str) -> None:
        def progress(count: int):
            with self._lock:
                entry = self._cache.get(root)
                if entry:
                    entry.files_scanned = count

        try:
            result = scan_directory(root, progress_callback=progress)
            with self._lock:
                self._cache[root] = CacheEntry(
                    result=result,
                    timestamp=time.time(),
                    state=ScanState.READY,
                    files_scanned=result.total_files,
                )
        except Exception as e:
            with self._lock:
                self._cache[root] = CacheEntry(
                    result=None,
                    timestamp=time.time(),
                    state=ScanState.ERROR,
                    error=str(e),
                )

    def invalidate(self, root: str) -> None:
        with self._lock:
            self._cache.pop(root, None)

    def all_statuses(self) -> dict[str, dict]:
        with self._lock:
            return {
                root: {
                    "state": entry.state,
                    "files_scanned": entry.files_scanned,
                    "error": entry.error,
                    "scan_time": entry.result.scan_time if entry.result else None,
                }
                for root, entry in self._cache.items()
            }
