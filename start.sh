#!/usr/bin/env bash
# ============================================================
# AI Learning Lab - Universal Startup Launcher (macOS & Linux)
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================================"
echo "      AI LEARNING LAB - APPLICATION LAUNCHER (macOS/Linux)  "
echo "============================================================"
echo "Project Root: $SCRIPT_DIR"
echo ""

# Determine open command
open_browser() {
    URL="$1"
    if command -v open >/dev/null 2>&1; then
        open "$URL" >/dev/null 2>&1 || true
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$URL" >/dev/null 2>&1 || true
    fi
}

# 1. Check Docker & Docker Compose
echo "[1/3] Checking Docker engine & Compose availability..."
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo "  [OK] Docker engine is active."
    echo ""
    echo "[2/3] Building & starting containers via Docker Compose..."
    if docker compose version >/dev/null 2>&1; then
        docker compose up -d --build
    else
        docker-compose up -d --build
    fi

    echo ""
    echo "[3/3] Waiting for backend container health check (http://localhost:8000/api/health)..."
    RETRIES=0
    HEALTHY=false
    while [ $RETRIES -lt 30 ]; do
        if curl -s -f http://localhost:8000/api/health >/dev/null 2>&1; then
            HEALTHY=true
            break
        fi
        RETRIES=$((RETRIES + 1))
        sleep 1
    done

    if [ "$HEALTHY" = true ]; then
        echo "  [OK] Backend container is healthy and ready!"
    else
        echo "  [WARNING] Backend is taking time to initialize model weights."
    fi

    echo ""
    echo "============================================================"
    echo "  APPLICATION IS READY (Docker Compose)!"
    echo "  Frontend: http://localhost:5173"
    echo "  Backend:  http://localhost:8000"
    echo "  API Docs: http://localhost:8000/docs"
    echo "  Health:   http://localhost:8000/api/health"
    echo "============================================================"
    echo ""
    echo "Opening http://localhost:5173 in your default browser..."
    open_browser "http://localhost:5173"

    echo ""
    echo "Containers are running in the background."
    echo "To STOP the application at any time, run: ./stop.sh"
    echo ""
    exit 0
fi

# Fallback: Native Execution via run.py
echo "  [INFO] Docker is not installed or the Docker daemon is not running."
echo "  [FALLBACK] Running in Native Execution Mode via Python runner (run.py)..."
echo ""

if command -v python3 >/dev/null 2>&1; then
    python3 run.py
elif command -v python >/dev/null 2>&1; then
    python run.py
else
    echo "[ERROR] Python 3 is required to run natively. Please install Python 3.10+."
    exit 1
fi
