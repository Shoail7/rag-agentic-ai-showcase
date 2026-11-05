#!/usr/bin/env python3
"""
============================================================
AI Learning Lab — Universal Cross-Platform Native Launcher
Runs on Windows, macOS, and Linux without requiring Docker
============================================================
"""

import os
import sys
import time
import subprocess
import webbrowser
import signal
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError

PROJECT_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
VENV_DIR = BACKEND_DIR / "venv"

IS_WINDOWS = sys.platform.startswith("win")

def get_venv_python():
    if IS_WINDOWS:
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"

def log(msg: str, status: str = "INFO"):
    colors = {
        "INFO": "\033[94m",
        "OK": "\033[92m",
        "WARN": "\033[93m",
        "ERROR": "\033[91m"
    }
    reset = "\033[0m"
    prefix = f"[{status}]"
    if sys.stdout.isatty() and not IS_WINDOWS:
        prefix = f"{colors.get(status, '')}[{status}]{reset}"
    print(f" {prefix} {msg}")

def check_node():
    log("Checking Node.js & npm installation...", "INFO")
    shell_flag = True if IS_WINDOWS else False
    try:
        node_v = subprocess.check_output(["node", "-v"], shell=shell_flag, text=True).strip()
        npm_v = subprocess.check_output(["npm", "-v"], shell=shell_flag, text=True).strip()
        log(f"Node {node_v} and npm {npm_v} detected.", "OK")
        return True
    except Exception:
        log("Node.js and npm are required. Please install Node.js LTS from https://nodejs.org", "ERROR")
        return False

def setup_venv():
    log("Checking backend virtual environment...", "INFO")
    venv_python = get_venv_python()
    if not venv_python.exists():
        log(f"Creating Python virtual environment in {VENV_DIR}...", "INFO")
        try:
            # Try system site packages first to reuse heavy pre-installed wheels if available
            subprocess.check_call([sys.executable, "-m", "venv", "--system-site-packages", str(VENV_DIR)])
        except Exception:
            subprocess.check_call([sys.executable, "-m", "venv", str(VENV_DIR)])
        log("Virtual environment created.", "OK")
    else:
        log("Existing virtual environment found.", "OK")

    # Verify dependencies
    log("Verifying backend dependencies...", "INFO")
    try:
        subprocess.check_call(
            [str(venv_python), "-c", "import fastapi, uvicorn, pymupdf"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        log("Backend dependencies verified.", "OK")
    except Exception:
        log("Installing backend dependencies from backend/requirements.txt...", "INFO")
        req_file = BACKEND_DIR / "requirements.txt"
        subprocess.check_call([str(venv_python), "-m", "pip", "install", "-r", str(req_file)])
        log("Backend dependencies installed successfully.", "OK")

def setup_frontend():
    log("Checking frontend dependencies...", "INFO")
    node_modules = FRONTEND_DIR / "node_modules"
    if not node_modules.exists():
        log("Installing frontend packages via npm...", "INFO")
        shell_cmd = True if IS_WINDOWS else False
        subprocess.check_call(["npm", "install"], cwd=str(FRONTEND_DIR), shell=shell_cmd)
        log("Frontend packages installed.", "OK")
    else:
        log("Frontend dependencies verified.", "OK")

def setup_env():
    log("Verifying local environment configuration...", "INFO")
    root_env = PROJECT_ROOT / ".env"
    root_example = PROJECT_ROOT / ".env.example"
    if not root_env.exists() and root_example.exists():
        with open(root_example, "r", encoding="utf-8") as f_in, open(root_env, "w", encoding="utf-8") as f_out:
            f_out.write(f_in.read())
        log("Created .env from .env.example", "OK")

    frontend_env = FRONTEND_DIR / ".env"
    if not frontend_env.exists():
        with open(frontend_env, "w", encoding="utf-8") as f:
            f.write("# Local development configuration\nVITE_API_BASE_URL=http://localhost:8000\n")
        log("Configured frontend/.env for http://localhost:8000", "OK")

def wait_for_health(timeout_sec: int = 25) -> bool:
    log("Waiting for backend health check (http://127.0.0.1:8000/api/health)...", "INFO")
    url = "http://127.0.0.1:8000/api/health"
    start = time.time()
    while time.time() - start < timeout_sec:
        try:
            req = Request(url, headers={"User-Agent": "AI-Learning-Lab-Launcher"})
            with urlopen(req, timeout=2) as resp:
                if resp.status == 200:
                    log("Backend is healthy and ready!", "OK")
                    return True
        except URLError:
            time.sleep(1)
        except Exception:
            time.sleep(1)
    log("Backend is taking longer than usual to initialize models.", "WARN")
    return False

def main():
    print("=" * 60)
    print("     AI LEARNING LAB — NATIVE CROSS-PLATFORM LAUNCHER")
    print("=" * 60)
    print(f" Working Directory: {PROJECT_ROOT}\n")

    if not check_node():
        sys.exit(1)

    setup_venv()
    setup_frontend()
    setup_env()

    venv_python = str(get_venv_python())
    shell_flag = True if IS_WINDOWS else False

    # Launch Backend
    log("Starting FastAPI backend on http://127.0.0.1:8000...", "INFO")
    backend_env = os.environ.copy()
    backend_env["PYTHONPATH"] = str(PROJECT_ROOT)
    backend_proc = subprocess.Popen(
        [venv_python, "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=str(PROJECT_ROOT),
        env=backend_env,
        shell=shell_flag
    )

    # Launch Frontend
    log("Starting React / Vite frontend on http://localhost:5173...", "INFO")
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev", "--", "--host", "0.0.0.0"],
        cwd=str(FRONTEND_DIR),
        shell=shell_flag
    )

    # Wait for Health
    wait_for_health()

    print("\n" + "=" * 60)
    print("  APPLICATION IS READY!")
    print("  Frontend UI:  http://localhost:5173")
    print("  Backend API:  http://localhost:8000")
    print("  Swagger Docs: http://localhost:8000/docs")
    print("  Health Check: http://localhost:8000/api/health")
    print("=" * 60 + "\n")

    try:
        webbrowser.open("http://localhost:5173")
    except Exception:
        pass

    print("Press Ctrl+C to stop both frontend and backend services.\n")

    def shutdown(signum=None, frame=None):
        print("\n\nShutting down AI Learning Lab services...")
        try:
            if IS_WINDOWS:
                subprocess.call(["taskkill", "/F", "/T", "/PID", str(backend_proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                subprocess.call(["taskkill", "/F", "/T", "/PID", str(frontend_proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                backend_proc.terminate()
                frontend_proc.terminate()
                backend_proc.wait(timeout=3)
                frontend_proc.wait(timeout=3)
        except Exception:
            pass
        log("All services cleanly terminated. Goodbye!", "OK")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # Keep main thread alive monitoring child processes
    while True:
        b_ret = backend_proc.poll()
        f_ret = frontend_proc.poll()
        if b_ret is not None or f_ret is not None:
            log("One of the services terminated unexpectedly.", "WARN")
            shutdown()
        time.sleep(1)

if __name__ == "__main__":
    main()

