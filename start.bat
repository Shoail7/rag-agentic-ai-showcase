@echo off
setlocal enabledelayedexpansion
title AI Learning Lab - Startup Launcher

cd /d "%~dp0"

echo ============================================================
echo         AI LEARNING LAB - LOCAL WINDOWS LAUNCHER
echo ============================================================
echo Project root: %CD%
echo.

:: 1. Check Python
echo [1/6] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your system PATH.
    echo Please install Python 3.10+ from https://www.python.org/
    echo Make sure to check "Add python.exe to PATH" during installation.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VER=%%i
echo   [OK] %PYTHON_VER% detected.

:: 2. Check Node.js and npm
echo.
echo [2/6] Checking Node.js and npm...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in your system PATH.
    echo Please install Node.js (LTS version) from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
npm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed or not in your system PATH.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
for /f "tokens=*" %%i in ('npm -v') do set NPM_VER=%%i
echo   [OK] Node %NODE_VER% and npm %NPM_VER% detected.

:: 3. Check and setup Virtual Environment
echo.
echo [3/6] Checking Python virtual environment (backend\venv)...
if not exist "backend\venv\Scripts\python.exe" (
    echo   Creating isolated virtual environment in backend\venv...
    python -m venv --system-site-packages backend\venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo   [OK] Virtual environment created.
) else (
    echo   [OK] Existing virtual environment found.
)

:: Check if backend dependencies are installed
backend\venv\Scripts\python.exe -c "import fastapi, uvicorn, pymupdf" >nul 2>&1
if %errorlevel% neq 0 (
    echo   Installing backend dependencies from backend\requirements.txt...
    echo   (This may take a few minutes on first setup)
    backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install backend dependencies.
        pause
        exit /b 1
    )
    echo   [OK] Backend dependencies installed successfully.
) else (
    echo   [OK] Backend dependencies verified.
)

:: 4. Check Frontend dependencies
echo.
echo [4/6] Checking frontend dependencies...
if not exist "frontend\node_modules" (
    echo   Installing frontend dependencies via npm...
    call npm --prefix frontend install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install frontend dependencies.
        pause
        exit /b 1
    )
    echo   [OK] Frontend dependencies installed.
) else (
    echo   [OK] Frontend dependencies verified.
)

:: 5. Ensure Environment Files Exist
echo.
echo [5/6] Checking configuration files...
if not exist ".env" (
    if exist ".env.example" (
        copy /y ".env.example" ".env" >nul
        echo   [OK] Created .env from .env.example
    )
)
if not exist "frontend\.env" (
    echo VITE_API_BASE_URL=http://localhost:8000> "frontend\.env"
    echo   [OK] Configured frontend\.env for local backend at http://localhost:8000
)

:: Clean up any leftover processes from previous runs if needed
if exist ".pids.json" (
    echo   Cleaning up previous session...
    call stop.bat >nul 2>&1
)

:: 6. Launch Backend & Frontend Services
echo.
echo [6/6] Launching backend and frontend servers...

:: Launch backend and capture PID using PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$proc = Start-Process -FilePath '%CD%\backend\venv\Scripts\python.exe' -ArgumentList '-m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000' -WorkingDirectory '%CD%' -PassThru -WindowStyle Normal;" ^
    "$proc.Id | Out-File -FilePath '%CD%\.backend.pid' -Encoding ascii;"
set /p BACKEND_PID=<.backend.pid
echo   [OK] Backend started (PID: %BACKEND_PID%) in dedicated window.

:: Launch frontend and capture PID using PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$proc = Start-Process -FilePath 'cmd.exe' -ArgumentList '/k npm --prefix frontend run dev' -WorkingDirectory '%CD%' -PassThru -WindowStyle Normal;" ^
    "$proc.Id | Out-File -FilePath '%CD%\.frontend.pid' -Encoding ascii;"
set /p FRONTEND_PID=<.frontend.pid
echo   [OK] Frontend started (PID: %FRONTEND_PID%) in dedicated window.

:: Write combined .pids.json
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "@{ backend_pid = [int](Get-Content '%CD%\.backend.pid'); frontend_pid = [int](Get-Content '%CD%\.frontend.pid'); started_at = (Get-Date).ToString('o') } | ConvertTo-Json | Out-File -FilePath '%CD%\.pids.json' -Encoding utf8;"
del /q .backend.pid >nul 2>&1
del /q .frontend.pid >nul 2>&1

:: Wait for backend health check
echo.
echo Waiting for backend health endpoint to respond (http://127.0.0.1:8000/api/health)...
set RETRIES=0
:POLL_LOOP
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    goto HEALTHY
)
set /a RETRIES+=1
if %RETRIES% geq 25 (
    echo [WARNING] Backend is taking longer than usual to respond. It may still be loading PyTorch models.
    goto READY_BANNER
)
ping -n 2 127.0.0.1 >nul
goto POLL_LOOP

:HEALTHY
echo [OK] Backend health check passed!

:READY_BANNER
echo.
echo ============================================================
echo   Application is ready!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ============================================================
echo.
echo Opening http://localhost:5173 in your default browser...
start http://localhost:5173

echo.
echo [STATUS] Both servers are running in separate visible windows:
echo   - Backend logs are visible in the Python/Uvicorn window
echo   - Frontend logs are visible in the Vite/Node window
echo.
echo To STOP all services:
echo   - Option 1: Press [S] then [Enter] right here
echo   - Option 2: Double-click stop.bat
echo   - Option 3: Press Ctrl+C in this window
echo.

:INTERACTIVE_LOOP
set /p USER_CHOICE="Enter 's' to stop all services (or press Ctrl+C): "
if /i "%USER_CHOICE%"=="s" (
    echo.
    call stop.bat
    exit /b 0
)
goto INTERACTIVE_LOOP
