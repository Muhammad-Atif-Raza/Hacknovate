@echo off
title Campus Resource Management Backend
cd /d "%~dp0"
echo ====================================================================
echo Starting Campus Resource Management Backend (FastAPI + Uvicorn)
echo URL: http://localhost:8000
echo Swagger UI Docs: http://localhost:8000/docs
echo ReDoc: http://localhost:8000/redoc
echo ====================================================================
"C:\Users\agrim\AppData\Local\Python\bin\python.exe" -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
