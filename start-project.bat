@echo off
setlocal EnableDelayedExpansion
title CampusHub - Project Launcher
cd /d "%~dp0"

echo ============================================
echo   CampusHub - Local Project Launcher
echo ============================================
echo.

REM ---------- 1. Check Node.js ----------
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo         Download it from https://nodejs.org (LTS version^)
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Reinstall Node.js (LTS version^).
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo [OK] Found %%v
echo.

REM ---------- 2. Start MongoDB + Redis (Docker if available) ----------
where docker >nul 2>nul
if not errorlevel 1 (
  echo [..] Starting MongoDB + Redis with Docker...
  docker compose up -d mongodb redis
  if errorlevel 1 (
    echo [WARN] 'docker compose up' failed. Make sure Docker Desktop is running,
    echo        and that MongoDB is reachable at 127.0.0.1:27017 another way.
  ) else (
    echo [OK] MongoDB (127.0.0.1:27017^) + Redis (127.0.0.1:6379^) starting...
  )
) else (
  echo [WARN] Docker not found - skipping container startup.
  echo        Make sure MongoDB is running at 127.0.0.1:27017 yourself.
)
echo.

REM ---------- 3. Backend .env ----------
if not exist "backend\.env" (
  echo [..] Creating backend\.env from template...
  copy /y "backend\.env.example" "backend\.env" >nul
  REM Generate random secrets with node and inject them
  for /f "tokens=*" %%s in ('node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"') do set GEN_SECRET=%%s
  powershell -NoProfile -Command ^
    "$p='backend\.env';" ^
    "$t=Get-Content $p -Raw;" ^
    "$t=$t -replace '(?m)^JWT_SECRET=.*$','JWT_SECRET=%GEN_SECRET%';" ^
    "$t=$t -replace '(?m)^SESSION_SECRET=.*$','SESSION_SECRET=%GEN_SECRET%';" ^
    "Set-Content $p $t"
  echo [OK] backend\.env created with generated secrets.
) else (
  echo [OK] backend\.env already exists.
)

REM ---------- 4. Frontend .env.local ----------
if not exist "frontend\.env.local" (
  echo [..] Creating frontend\.env.local...
  (
    echo # CampusHub Frontend Configuration
    echo NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
    echo NEXT_PUBLIC_ENABLE_MOCK_PAYMENTS=true
  ) > "frontend\.env.local"
  echo [OK] frontend\.env.local created.
) else (
  echo [OK] frontend\.env.local already exists.
)
echo.

REM ---------- 5. Install dependencies if missing ----------
if not exist "backend\node_modules" (
  echo [..] Installing backend dependencies (first run, may take a few minutes^)...
  pushd backend
  call npm install
  popd
) else (
  echo [OK] Backend dependencies already installed.
)
if not exist "frontend\node_modules" (
  echo [..] Installing frontend dependencies (first run, may take a few minutes^)...
  pushd frontend
  call npm install
  popd
) else (
  echo [OK] Frontend dependencies already installed.
)
echo.

REM ---------- 6. Launch servers in separate windows ----------
echo [..] Starting BACKEND  (http://localhost:5000^) in a new window...
start "CampusHub Backend :5000" /D "%~dp0backend" cmd /k npm run dev

echo [..] Starting FRONTEND (http://localhost:3000^) in a new window...
start "CampusHub Frontend :3000" /D "%~dp0frontend" cmd /k npm run dev
echo.

REM ---------- 7. Wait for backend, then open browser ----------
echo [..] Waiting for backend to respond...
set TRIES=0
:waitloop
set /a TRIES+=1
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 http://localhost:5000/api/v1/health).StatusCode } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 goto backendup
if %TRIES% GEQ 40 (
  echo [WARN] Backend did not respond after ~2 minutes. Check the backend window for errors.
  echo        Frontend: http://localhost:3000
  pause
  exit /b 0
)
timeout /t 3 /nobreak >nul
goto waitloop

:backendup
echo [OK] Backend is up.
echo [..] Opening http://localhost:3000 in your browser...
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"
echo.
echo ============================================
echo   CampusHub is running!
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:5000/api/v1/health
echo   (Close the two server windows to stop everything^)
echo ============================================
pause
