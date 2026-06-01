# GroveMap

Disk usage analyzer with an interactive treemap web UI. Built for Unraid but runs anywhere Docker does.

Mount any directories into the container and GroveMap will scan them, cache the results, and present an interactive treemap you can drill into. Filter files by name, extension, or date to find what's eating your storage.

## Quick Start

```bash
docker build -t grovemap .
docker run -d -p 8080:8080 -v /mnt/user:/data/user:ro --name grovemap grovemap
```

Open `http://your-server:8080`.

## Features

- **Interactive treemap** - proportional visualization of disk usage, click to drill down
- **Multiple volumes** - mount as many directories as you need under `/data/`
- **Filtering** - search by file name, extension, or modification date range
- **Background scanning** - UI stays responsive while scans run
- **Auto-discovery** - any directory under `/data/` becomes a scannable root
- **Read-only** - all mounts use `:ro`, GroveMap never modifies your files

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `SCAN_CACHE_TTL` | `300` | Seconds to cache scan results before they expire |
| `SCAN_ON_START` | `true` | Automatically scan all roots when the container starts |
| `DATA_ROOT` | `/data` | Base path where mounted volumes are discovered |
| `PORT` | `8080` | Web UI port (change CMD in Dockerfile if needed) |

## Unraid Installation

### Via Docker CLI

```bash
docker run -d \
  --name grovemap \
  -p 8080:8080 \
  -v /mnt/user/media:/data/media:ro \
  -v /mnt/user/documents:/data/documents:ro \
  -e SCAN_CACHE_TTL=300 \
  --restart unless-stopped \
  grovemap
```

### Via Unraid Docker UI

1. Go to **Docker > Add Container**
2. Set **Repository** to `grovemap` (or your built image name)
3. Add a **Port** mapping: host `8080` -> container `8080`
4. Add **Path** mappings for each directory to scan:
   - Host: `/mnt/user/media` -> Container: `/data/media`, Access: **Read Only**
5. Set **WebUI** to `http://[IP]:[PORT:8080]`

An Unraid template XML is included in `unraid-template.xml`.

## Development

### Prerequisites

- Python 3.12+
- Node.js 20+
- npm

### Backend

```bash
cd backend
pip install -r requirements.txt
DATA_ROOT=./test-data STATIC_DIR=../frontend/dist uvicorn main:app --reload --port 8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs on port 5173 and proxies `/api` requests to the backend on port 8080.

### Project Structure

```
grovemap/
├── Dockerfile              # Multi-stage build (node + python-alpine)
├── docker-compose.yml      # Local testing with Docker
├── unraid-template.xml     # Unraid Community Apps template
├── backend/
│   ├── requirements.txt    # fastapi, uvicorn
│   ├── main.py             # API routes + SPA serving
│   ├── scanner.py          # Recursive directory scanner (os.scandir)
│   └── cache.py            # In-memory TTL cache with background scanning
└── frontend/
    ├── package.json
    ├── vite.config.ts      # Dev proxy to backend
    └── src/
        ├── App.tsx         # Root selector / treemap view routing
        ├── api/client.ts   # React Query hooks
        ├── utils.ts        # formatSize, formatDate, color palette
        └── components/
            ├── RootSelector.tsx   # Volume cards with scan status
            ├── TreemapView.tsx    # Main view: treemap + filters + file list
            ├── Treemap.tsx        # d3-hierarchy SVG treemap
            ├── Breadcrumb.tsx     # Drill-down navigation
            ├── FilterPanel.tsx    # Name/extension/date filters
            ├── FileList.tsx       # Filtered file results table
            └── ScanStatus.tsx     # Scan progress indicator
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/roots` | List mounted volumes with scan status |
| `GET` | `/api/tree?root=...&depth=3&path=...` | Directory tree with sizes |
| `GET` | `/api/files?root=...&name=...&extension=...` | Filtered file listing |
| `POST` | `/api/scan?root=...` | Trigger a rescan |
| `GET` | `/api/status` | Scan status for all roots |

### Architecture Decisions

- **No database** - scan results are cached in memory with a configurable TTL. For datasets under 500K files, a full scan completes in seconds and the memory footprint is manageable.
- **Depth-limited tree responses** - the API returns trees truncated at a configurable depth. The frontend requests deeper levels on drill-down to avoid sending massive payloads.
- **Background scanning** - scans run in a daemon thread. The API serves cached data while a rescan is in progress, and the frontend polls for completion.
- **Read-only mounts** - volumes are mounted as `:ro` by default. The scanner only reads file metadata (`os.scandir` + `stat`), never modifies files.

## License

MIT
