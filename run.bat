@echo off
title PureFlow Service Hub – Starting...
color 0B
set PYTHON=C:\Users\gurus\AppData\Local\Python\bin\python.exe

echo.
echo  ██████╗ ██╗   ██╗██████╗ ███████╗███████╗██╗      ██████╗ ██╗    ██╗
echo  ██╔══██╗██║   ██║██╔══██╗██╔════╝██╔════╝██║     ██╔═══██╗██║    ██║
echo  ██████╔╝██║   ██║██████╔╝█████╗  █████╗  ██║     ██║   ██║██║ █╗ ██║
echo  ██╔═══╝ ██║   ██║██╔══██╗██╔══╝  ██╔══╝  ██║     ██║   ██║██║███╗██║
echo  ██║     ╚██████╔╝██║  ██║███████╗██║     ███████╗╚██████╔╝╚███╔███╔╝
echo  ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝
echo.
echo               Service Hub – RO Sales ^& Service Management
echo  ─────────────────────────────────────────────────────────────────────
echo.

REM ── Step 1: Create virtual environment if not exists ──────────────────
if not exist "venv\" (
    echo [1/4] Creating Python virtual environment...
    "%PYTHON%" -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment. Is Python installed?
        pause
        exit /b 1
    )
    echo       Done.
) else (
    echo [1/4] Virtual environment already exists.
)

REM ── Step 2: Activate venv ─────────────────────────────────────────────
echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

REM ── Step 3: Install dependencies ──────────────────────────────────────
echo [3/4] Installing dependencies...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: Failed to install packages.
    pause
    exit /b 1
)
echo       Done.

REM ── Step 4: Setup .env ────────────────────────────────────────────────
if not exist ".env" (
    echo [4/4] Creating .env from template...
    copy .env.example .env >nul
    echo       Done.
) else (
    echo [4/4] .env already exists.
)

REM ── Step 5: Seed Database ─────────────────────────────────────────────
echo.
echo  Seeding database with demo data...
"%PYTHON%" -m backend.seed_data
echo.

REM ── Step 6: Launch Server ─────────────────────────────────────────────
echo  ─────────────────────────────────────────────────────────────────────
echo   Server starting at: http://127.0.0.1:5000
echo   Press Ctrl+C to stop.
echo  ─────────────────────────────────────────────────────────────────────
echo.

start "" "http://127.0.0.1:5000"
"%PYTHON%" -m backend.app
pause
