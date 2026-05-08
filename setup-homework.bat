@echo off
echo ================================
echo Homework System Setup Script
echo ================================
echo.

REM Create upload directories
echo Creating upload directories...
if not exist "backend\uploads\homework" mkdir backend\uploads\homework
echo Created backend\uploads\homework
echo.

REM Navigate to backend
if exist "backend" cd backend

REM Install backend dependencies
echo Installing backend dependencies...
if exist "package.json" (
  call npm install multer
  echo Installed multer
) else (
  echo package.json not found. Please run from project root or backend directory.
  exit /b 1
)

echo.
echo ================================
echo Setup Complete!
echo ================================
echo.
echo Next steps:
echo 1. Start the backend server: npm run dev
echo 2. Start the frontend: cd ..\frontend ^&^& npm run dev
echo 3. Navigate to /homework to access the system
echo.
echo Documentation: See HOMEWORK_SYSTEM.md for details
pause
