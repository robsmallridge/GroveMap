# Stage 1: Build frontend
FROM node:26-trixie AS frontend-build

RUN set -eux; \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates tzdata curl bash iputils-ping wget && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Production image
FROM python:3.14-slim-trixie

RUN set -eux; \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates tzdata curl bash iputils-ping wget && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY backend/ .

# Copy built frontend
COPY --from=frontend-build /build/dist /app/static

# Environment
ENV DATA_ROOT=/data
ENV SCAN_CACHE_TTL=300
ENV SCAN_ON_START=true
ENV SCAN_SKIP_MOUNTS=false
ENV SCAN_EXCLUDE=
ENV STATIC_DIR=/app/static
ENV PORT=8080

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

