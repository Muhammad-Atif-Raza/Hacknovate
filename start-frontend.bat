@echo off
echo ========================================================
echo Starting Campus Resource Hub - Frontend (Vite + React)
echo ========================================================
set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
cd /d "%~dp0\frontend"
npm run dev
pause
