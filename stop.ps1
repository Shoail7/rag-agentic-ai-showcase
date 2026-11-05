# ============================================================
# AI Learning Lab - PowerShell Shutdown Controller
# ============================================================

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         AI LEARNING LAB - SHUTDOWN CONTROLLER (PS)         " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Stop Docker Compose services
try {
    $info = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n[1/3] Stopping Docker Compose containers..." -ForegroundColor Yellow
        docker compose down
        Write-Host "  [OK] Docker containers stopped. Volumes preserved." -ForegroundColor Green
    }
} catch {}

# 2. Stop native services if tracked in .pids.json
$pidsFile = Join-Path $projectRoot ".pids.json"
if (Test-Path $pidsFile) {
    Write-Host "`n[2/3] Stopping native services from .pids.json..." -ForegroundColor Yellow
    try {
        $p = Get-Content $pidsFile -Raw | ConvertFrom-Json
        if ($p.backend_pid) {
            Stop-Process -Id $p.backend_pid -Force -ErrorAction SilentlyContinue
            Write-Host "  [OK] Stopped backend service (PID: $($p.backend_pid))" -ForegroundColor Green
        }
        if ($p.frontend_pid) {
            Stop-Process -Id $p.frontend_pid -Force -ErrorAction SilentlyContinue
            Write-Host "  [OK] Stopped frontend service (PID: $($p.frontend_pid))" -ForegroundColor Green
        }
    } catch {}
    Remove-Item $pidsFile -Force -ErrorAction SilentlyContinue
}

# 3. Port check for 8000 & 5173
Write-Host "`n[3/3] Checking ports 8000 and 5173..." -ForegroundColor Yellow
try {
    $conns = Get-NetTCPConnection -LocalPort 8000,5173 -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
            Write-Host "  [OK] Released Port $($c.LocalPort) (PID: $($c.OwningProcess))" -ForegroundColor Green
        }
    } else {
        Write-Host "  [OK] All ports are free." -ForegroundColor Green
    }
} catch {
    Write-Host "  [OK] Ports verified." -ForegroundColor Green
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  [SUCCESS] All AI Learning Lab services have been stopped." -ForegroundColor Green
Write-Host "  Uploaded PDFs, SQLite DB and FAISS indexes are preserved." -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Cyan
