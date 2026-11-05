@echo off
setlocal enabledelayedexpansion
title AI Learning Lab - Shutdown Controller

cd /d "%~dp0"

echo ============================================================
echo          AI LEARNING LAB - SHUTDOWN CONTROLLER
echo ============================================================
echo.

:: 1. Stop Docker Compose services if running
docker compose version >nul 2>&1
if %errorlevel% equ 0 (
    docker info >nul 2>&1
    if %errorlevel% equ 0 (
        echo [1/3] Stopping Docker Compose containers...
        docker compose down
        echo   [OK] Docker containers stopped. Persistent data volume is preserved.
    )
)

:: 2. Stop native processes recorded in .pids.json if any
if exist ".pids.json" (
    echo.
    echo [2/3] Stopping native services tracked in .pids.json...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$p = Get-Content '.pids.json' -Raw | ConvertFrom-Json;" ^
        "if ($p.backend_pid) { Stop-Process -Id $p.backend_pid -Force -ErrorAction SilentlyContinue; Write-Host '  [OK] Stopped backend service (PID: ' $p.backend_pid ')' };" ^
        "if ($p.frontend_pid) { Stop-Process -Id $p.frontend_pid -Force -ErrorAction SilentlyContinue; Write-Host '  [OK] Stopped frontend service (PID: ' $p.frontend_pid ')' };"
    del /q ".pids.json" >nul 2>&1
)

:: 3. Port cleanup safeguard: ensure ports 8000 & 5173 are free
echo.
echo [3/3] Verifying ports 8000 and 5173 are free...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$conns = Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue;" ^
    "if ($conns) { foreach ($c in $conns) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host '  [OK] Released Port ' $c.LocalPort ' (PID: ' $c.OwningProcess ')' } } else { Write-Host '  [OK] All ports are free.' }"

if exist ".backend.pid" del /q ".backend.pid" >nul 2>&1
if exist ".frontend.pid" del /q ".frontend.pid" >nul 2>&1

echo.
echo ============================================================
echo   [SUCCESS] All AI Learning Lab services have been stopped.
echo   Uploaded PDFs, SQLite DB and FAISS indexes are preserved.
echo ============================================================
echo.
ping -n 2 127.0.0.1 >nul
exit /b 0
