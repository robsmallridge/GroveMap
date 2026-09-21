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
        # Return the cached entry regardless of age. Stale results are kept and
        # served so that navigation never blanks the UI; callers use is_stale()
        # to decide whether to kick off a background refresh.
        with self._lock:
            return self._cache.get(root)

    def is_stale(self, root: str) -> bool:
        """True if there is no usable result yet, or it has aged past the TTL."""
        with self._lock:
            entry = self._cache.get(root)
            if entry is None or entry.result is None:
                return True
            return (time.time() - entry.timestamp) > self.ttl

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

            if entry is not None:
                # Keep serving the previous result while we refresh in the
                # background; _do_scan swaps it out atomically when finished.
                entry.state = ScanState.SCANNING
                entry.files_scanned = 0
            else:
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
                entry = self._cache.get(root)
                if entry is not None and entry.result is not None:
                    # A background refresh failed: keep the previous good result
                    # rather than blanking the UI. Bump the timestamp so we back
                    # off for the TTL instead of retrying on every request.
                    entry.state = ScanState.READY
                    entry.error = str(e)
                    entry.timestamp = time.time()
                else:
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
