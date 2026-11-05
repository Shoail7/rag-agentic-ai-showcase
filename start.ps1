# ============================================================
# AI Learning Lab - PowerShell Universal Startup Launcher
# ============================================================

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "          AI LEARNING LAB - APPLICATION LAUNCHER (PS)       " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Project Root: $projectRoot`n"

# 1. Check Docker & Docker Compose
Write-Host "[1/3] Checking Docker engine & Compose availability..." -ForegroundColor Yellow
$dockerRunning = $false
try {
    $info = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerRunning = $true
        Write-Host "  [OK] Docker engine is active." -ForegroundColor Green
    } else {
        Write-Host "  [INFO] Docker engine is not running or Docker Desktop is closed." -ForegroundColor Gray
    }
} catch {
    Write-Host "  [INFO] Docker command not found." -ForegroundColor Gray
}

if ($dockerRunning) {
    Write-Host "`n[2/3] Building & starting containers via Docker Compose..." -ForegroundColor Yellow
    docker compose up -d --build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Docker Compose encountered an error. Falling back to native execution..." -ForegroundColor Red
        $dockerRunning = $false
    } else {
        Write-Host "`n[3/3] Waiting for backend health check (http://localhost:8000/api/health)..." -ForegroundColor Yellow
        $healthy = $false
        for ($i = 0; $i -lt 30; $i++) {
            try {
                $r = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing -TimeoutSec 2
                if ($r.StatusCode -eq 200) {
                    $healthy = $true
                    break
                }
            } catch {
                Start-Sleep -Seconds 1
            }
        }

        if ($healthy) {
            Write-Host "  [OK] Backend health check passed!" -ForegroundColor Green
        } else {
            Write-Host "  [WARNING] Backend container is taking time to initialize model weights." -ForegroundColor Yellow
        }

        Write-Host "`n============================================================" -ForegroundColor Cyan
        Write-Host "  APPLICATION IS READY (Docker Compose)!" -ForegroundColor Green
        Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
        Write-Host "  Backend:  http://localhost:8000" -ForegroundColor White
        Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor White
        Write-Host "  Health:   http://localhost:8000/api/health" -ForegroundColor White
        Write-Host "============================================================`n" -ForegroundColor Cyan

        Start-Process "http://localhost:5173"

        Write-Host "Containers are running in the background." -ForegroundColor Gray
        Write-Host "To STOP the application at any time, run: .\stop.ps1 or stop.bat`n" -ForegroundColor Yellow
        return
    }
}

# Fallback: Native Execution via run.py
Write-Host "`n[INFO] Running in Native Execution Mode via Python runner (run.py)..." -ForegroundColor Cyan
python run.py
