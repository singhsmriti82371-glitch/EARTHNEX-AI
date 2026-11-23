@echo off
title EARTHNEX AI - Real-Time Telemetry Server
cd /d "%~dp0backend"
echo Checking Python dependencies...
python -m pip install fastapi uvicorn pydantic --quiet
echo Starting EARTHNEX AI Server on http://127.0.0.1:8000 ...
start "" "http://127.0.0.1:8000"
python -m uvicorn main:app --host 127.0.0.1 --port 8000
pause
