# ============================================================
#         AI LEARNING LAB - POWERSHELL STARTUP LAUNCHER
# ============================================================

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "        AI LEARNING LAB - LOCAL WINDOWS LAUNCHER (PS)       " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Project root: $projectRoot`n"

# 1. Check Python
Write-Host "[1/6] Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  [OK] $pythonVersion detected." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python 3.10+ is required. Please install from https://python.org" -ForegroundColor Red
    pause
    exit 1
}

# 2. Check Node & npm
Write-Host "`n[2/6] Checking Node.js and npm..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v 2>&1
    $npmVersion = npm -v 2>&1
    Write-Host "  [OK] Node $nodeVersion and npm $npmVersion detected." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js and npm are required. Please install LTS from https://nodejs.org" -ForegroundColor Red
    pause
    exit 1
}

# 3. Virtual Environment
Write-Host "`n[3/6] Checking Python virtual environment (backend\venv)..." -ForegroundColor Yellow
$venvPython = Join-Path $projectRoot "backend\venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "  Creating virtual environment in backend\venv..." -ForegroundColor Gray
    python -m venv --system-site-packages backend\venv
    Write-Host "  [OK] Virtual environment created." -ForegroundColor Green
} else {
    Write-Host "  [OK] Existing virtual environment found." -ForegroundColor Green
}

# Check backend packages
try {
    & $venvPython -c "import fastapi, uvicorn, pymupdf" 2>$null
    Write-Host "  [OK] Backend dependencies verified." -ForegroundColor Green
} catch {
    Write-Host "  Installing dependencies from backend\requirements.txt..." -ForegroundColor Gray
    & $venvPython -m pip install -r backend\requirements.txt
    Write-Host "  [OK] Backend dependencies installed." -ForegroundColor Green
}

# 4. Frontend dependencies
Write-Host "`n[4/6] Checking frontend dependencies..." -ForegroundColor Yellow
$nodeModules = Join-Path $projectRoot "frontend\node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "  Installing frontend dependencies via npm..." -ForegroundColor Gray
    npm --prefix frontend install
    Write-Host "  [OK] Frontend dependencies installed." -ForegroundColor Green
} else {
    Write-Host "  [OK] Frontend dependencies verified." -ForegroundColor Green
}

# 5. Environment configuration
Write-Host "`n[5/6] Checking configuration files..." -ForegroundColor Yellow
if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Host "  [OK] Created .env from .env.example" -ForegroundColor Green
}
$frontendEnv = Join-Path $projectRoot "frontend\.env"
if (-not (Test-Path $frontendEnv)) {
    "VITE_API_BASE_URL=http://localhost:8000" | Out-File -FilePath $frontendEnv -Encoding utf8
    Write-Host "  [OK] Configured frontend\.env for local backend" -ForegroundColor Green
}

# Clean any existing sessions
if (Test-Path ".pids.json") {
    Write-Host "  Cleaning up previous session..." -ForegroundColor Gray
    & ".\stop.bat" | Out-Null
}

# 6. Launch Services
Write-Host "`n[6/6] Launching backend and frontend servers..." -ForegroundColor Yellow

# Start backend
$backendProc = Start-Process -FilePath $venvPython -ArgumentList "-m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000" -WorkingDirectory $projectRoot -PassThru -WindowStyle Normal
Write-Host "  [OK] Backend started (PID: $($backendProc.Id)) in dedicated window." -ForegroundColor Green

# Start frontend
$frontendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/k npm --prefix frontend run dev" -WorkingDirectory $projectRoot -PassThru -WindowStyle Normal
Write-Host "  [OK] Frontend started (PID: $($frontendProc.Id)) in dedicated window." -ForegroundColor Green

# Save PIDs
@{
    backend_pid = $backendProc.Id
    frontend_pid = $frontendProc.Id
    started_at = (Get-Date).ToString("o")
} | ConvertTo-Json | Out-File -FilePath (Join-Path $projectRoot ".pids.json") -Encoding utf8

# Wait for backend health check
Write-Host "`nWaiting for backend health check (http://127.0.0.1:8000/api/health)..." -ForegroundColor Gray
$healthy = $false
for ($i = 0; $i -lt 25; $i++) {
    try {
        $res = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/health" -UseBasicParsing -TimeoutSec 2
        if ($res.StatusCode -eq 200) {
            $healthy = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if ($healthy) {
    Write-Host "[OK] Backend health check passed!" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Backend is taking time to initialize (loading model tensors)." -ForegroundColor Yellow
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  Application is ready!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "============================================================`n" -ForegroundColor Cyan

Start-Process "http://localhost:5173"

Write-Host "Both servers are running in separate visible windows." -ForegroundColor Gray
Write-Host "To STOP all services, press 's' and Enter (or run stop.bat in another terminal):" -ForegroundColor Yellow

while ($true) {
    $input = Read-Host
    if ($input -eq 's' -or $input -eq 'S') {
        & ".\stop.bat"
        break
    }
}
