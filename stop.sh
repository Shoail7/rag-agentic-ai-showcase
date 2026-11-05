#!/usr/bin/env bash
# ============================================================
# AI Learning Lab - Shutdown Controller (macOS & Linux)
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================================"
echo "      AI LEARNING LAB - SHUTDOWN CONTROLLER (macOS/Linux)   "
echo "============================================================"
echo ""

# 1. Stop Docker Compose services
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo "[1/3] Stopping Docker Compose containers..."
    if docker compose version >/dev/null 2>&1; then
        docker compose down
    else
        docker-compose down
    fi
    echo "  [OK] Docker containers stopped. Volumes preserved."
fi

# 2. Stop native services if tracked in .pids.json
if [ -f ".pids.json" ]; then
    echo ""
    echo "[2/3] Stopping native services from .pids.json..."
    BACKEND_PID=$(grep -o '"backend_pid": *[0-9]*' .pids.json | awk '{print $2}')
    FRONTEND_PID=$(grep -o '"frontend_pid": *[0-9]*' .pids.json | awk '{print $2}')
    if [ -n "$BACKEND_PID" ]; then
        kill -9 "$BACKEND_PID" >/dev/null 2>&1 || true
        echo "  [OK] Stopped backend service (PID: $BACKEND_PID)"
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill -9 "$FRONTEND_PID" >/dev/null 2>&1 || true
        echo "  [OK] Stopped frontend service (PID: $FRONTEND_PID)"
    fi
    rm -f .pids.json
fi

# 3. Port check for 8000 & 5173
echo ""
echo "[3/3] Checking ports 8000 and 5173..."
if command -v lsof >/dev/null 2>&1; then
    P8000=$(lsof -ti:8000 2>/dev/null || true)
    P5173=$(lsof -ti:5173 2>/dev/null || true)
    if [ -n "$P8000" ]; then
        kill -9 $P8000 >/dev/null 2>&1 || true
        echo "  [OK] Released Port 8000"
    fi
    if [ -n "$P5173" ]; then
        kill -9 $P5173 >/dev/null 2>&1 || true
        echo "  [OK] Released Port 5173"
    fi
fi

echo ""
echo "============================================================"
echo "  [SUCCESS] All AI Learning Lab services have been stopped."
echo "  Uploaded PDFs, SQLite DB and FAISS indexes are preserved."
echo "============================================================"
echo ""

