@echo off
setlocal enabledelayedexpansion
title AI Learning Lab - Universal Launcher

cd /d "%~dp0"

echo ============================================================
echo           AI LEARNING LAB - APPLICATION LAUNCHER
echo ============================================================
echo Project Root: %CD%
echo.

:: 1. Check if Docker daemon is running
echo [1/3] Checking Docker & Docker Compose availability...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   [INFO] Docker is not installed or not in PATH.
    goto RUN_NATIVE
)

docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo   [INFO] Docker Desktop is installed but the Docker engine is not running.
    echo   (To run with Docker containers, start Docker Desktop and re-run this script.)
    goto RUN_NATIVE
)

:: Docker is active -> Preferred Docker Compose launch
echo   [OK] Docker engine and Docker Compose are active!
echo.
echo [2/3] Building & starting containers with Docker Compose...
echo   (This builds the backend Python 3.11 container and frontend Vite container)
echo.

docker compose up -d --build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Docker Compose failed to build or start.
    echo Falling back to native execution...
    goto RUN_NATIVE
)

echo.
echo [3/3] Waiting for backend container health check (http://localhost:8000/api/health)...
set RETRIES=0
:DOCKER_POLL
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { $r = Invoke-WebRequest -Uri 'http://localhost:8000/api/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    goto DOCKER_READY
)
set /a RETRIES+=1
if %RETRIES% geq 30 (
    echo   [WARNING] Backend container is taking time to initialize model tensors.
    goto DOCKER_READY
)
ping -n 2 127.0.0.1 >nul
goto DOCKER_POLL

:DOCKER_READY
echo.
echo ============================================================
echo   APPLICATION IS READY (Docker Compose)!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo   Health:   http://localhost:8000/api/health
echo ============================================================
echo.
echo Opening http://localhost:5173 in your default browser...
start http://localhost:5173

echo.
echo Containers are running in the background.
echo To STOP the application at any time, run:
echo   stop.bat
echo.
pause
exit /b 0

:: ============================================================
:: Native Execution Fallback (when Docker is not running)
:: ============================================================
:RUN_NATIVE
echo.
echo [INFO] Running in Native Execution Mode via Python runner (run.py)...
echo.
python run.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Native execution exited with error code %errorlevel%.
    pause
    exit /b 1
)
exit /b 0
