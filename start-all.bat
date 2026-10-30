@echo off
echo ========================================================
echo Launching Campus Resource Hub Full Stack Application
echo ========================================================
start "Campus Hub Backend" cmd /c "%~dp0start-backend.bat"
timeout /t 3 /nobreak >nul
start "Campus Hub Frontend" cmd /c "%~dp0start-frontend.bat"
echo Services launched!
echo Frontend: http://localhost:5173
echo Backend API Docs: http://127.0.0.1:8000/docs
