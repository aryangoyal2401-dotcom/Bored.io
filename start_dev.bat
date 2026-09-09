@echo off
title Sahayak Kiosk - Local Development Launcher
echo ========================================================
echo  Starting Sahayak - Patient Case-Taking Software
echo ========================================================
echo.

echo [1/2] Launching FastAPI Backend on Port 8000...
start "Sahayak Backend (FastAPI)" cmd /k "cd /d %~dp0backend\simple_backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching Vite React Frontend on Port 5173...
start "Sahayak Frontend (Vite)" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ========================================================
echo  Sahayak is ready for testing!
echo.
echo  - Sahayak Kiosk (Case-Taking):    http://localhost:5173/kiosk
echo  - Practitioner Dashboard:          http://localhost:5173/dashboard
echo  - Landing Page:                    http://localhost:5173/
echo  - Interactive API Docs:            http://127.0.0.1:8000/docs
echo ========================================================
echo.
pause
