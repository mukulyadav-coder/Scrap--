@echo off
echo ========================================================
echo Starting ScrapSetu (FastAPI + React Vite)
echo ========================================================

start "Legacy Marketplace API (8000)" cmd /k "cd /d server && python -m uvicorn main:app --port 8000 --reload"
start "ScrapSetu Auth API (8001)" cmd /k "cd /d scrapsetu\backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload"
start "ScrapSetu Web Client" cmd /k "cd /d client && npm run dev"

echo.
echo The web client and both APIs are launching:
echo - Frontend: http://localhost:5173
echo - Legacy API & Docs: http://127.0.0.1:8000/docs
echo - ScrapSetu auth API: http://127.0.0.1:8001/api/auth
echo Configure scrapsetu\backend\.env before startup (see .env.example).
echo ========================================================
