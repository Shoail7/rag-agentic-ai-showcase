@echo off
setlocal enabledelayedexpansion
title AI Learning Lab - Shutdown Controller

cd /d "%~dp0"

echo ============================================================
echo          AI LEARNING LAB - SHUTDOWN CONTROLLER
echo ============================================================
echo.

set STOPPED_ANY=0

:: 1. Stop processes recorded in .pids.json
if exist ".pids.json" (
    echo [1/3] Reading tracked process IDs from .pids.json...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "$p = Get-Content '.pids.json' -Raw | ConvertFrom-Json;" ^
        "if ($p.backend_pid) { Stop-Process -Id $p.backend_pid -Force -ErrorAction SilentlyContinue; Write-Host '  [OK] Stopped backend service (PID: ' $p.backend_pid ')' };" ^
        "if ($p.frontend_pid) { Stop-Process -Id $p.frontend_pid -Force -ErrorAction SilentlyContinue; Write-Host '  [OK] Stopped frontend service (PID: ' $p.frontend_pid ')' };"
    del /q ".pids.json" >nul 2>&1
    set STOPPED_ANY=1
)

:: 2. Safety cleanup: check if port 8000 is still held
echo.
echo [2/3] Checking Port 8000 (Backend)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$conns = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue;" ^
    "if ($conns) { foreach ($c in $conns) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host '  [OK] Released Port 8000 (PID: ' $c.OwningProcess ')' } } else { Write-Host '  [OK] Port 8000 is free.' }"

:: 3. Safety cleanup: check if port 5173 is still held
echo.
echo [3/3] Checking Port 5173 (Frontend)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$conns = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue;" ^
    "if ($conns) { foreach ($c in $conns) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host '  [OK] Released Port 5173 (PID: ' $c.OwningProcess ')' } } else { Write-Host '  [OK] Port 5173 is free.' }"

:: Clean up temporary PID files if any exist
if exist ".backend.pid" del /q ".backend.pid" >nul 2>&1
if exist ".frontend.pid" del /q ".frontend.pid" >nul 2>&1

echo.
echo ============================================================
echo   [SUCCESS] All AI Learning Lab services have been stopped.
echo ============================================================
echo.
ping -n 2 127.0.0.1 >nul
exit /b 0
