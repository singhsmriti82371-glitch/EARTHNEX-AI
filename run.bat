@echo off
REM One-command start for Windows. Needs: Python 3.10+, Node 18+, internet.
cd /d %~dp0
echo ==> Backend setup
cd backend
if not exist venv python -m venv venv
call venv\Scripts\activate
pip install -q -r requirements.txt
python db.py
start "EARTHNEX backend" cmd /k "venv\Scripts\activate && uvicorn main:app --port 8000"
cd ..\frontend
echo ==> Frontend setup
if not exist node_modules call npm install
echo ==> Open http://localhost:5173
call npm run dev
