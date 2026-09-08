@echo off
title Swasya AI - MediKiosk Local Launcher
echo ========================================================
echo  Starting Swasya AI - MediKiosk Local Development
echo ========================================================
echo.

echo [1/2] Launching FastAPI Backend on Port 8000...
start "MediKiosk Backend (FastAPI)" cmd /k "cd /d %~dp0backend\simple_backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching Vite React Frontend on Port 5173...
start "MediKiosk Frontend (Vite)" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ========================================================
echo  MediKiosk is ready for testing!
echo.
echo  - Patient Kiosk (Self-Service):  http://localhost:5173/kiosk
echo  - Doctor Consultation Console:   http://localhost:5173/dashboard
echo  - Swasya AI Landing Page:        http://localhost:5173/
echo  - Interactive API Docs:          http://127.0.0.1:8000/docs
echo ========================================================
echo.
pause
