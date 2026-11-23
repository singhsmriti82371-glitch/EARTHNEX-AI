#!/usr/bin/env bash
# One-command start for macOS / Linux. Needs: Python 3.10+, Node 18+, internet.
set -e
cd "$(dirname "$0")"
[ -f .env ] && set -a && . ./.env && set +a

echo "==> Backend setup"
cd backend
[ -d venv ] || python3 -m venv venv
. venv/bin/activate
pip install -q -r requirements.txt
python db.py                       # makes sure the SQLite DB exists and is seeded
uvicorn main:app --port 8000 &
BACK=$!
cd ../frontend

echo "==> Frontend setup"
[ -d node_modules ] || npm install
trap "kill $BACK 2>/dev/null" EXIT
echo "==> Open http://localhost:5173"
npm run dev
