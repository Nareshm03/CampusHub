@echo off
echo ========================================
echo CampusHub Deployment Quick Start
echo ========================================
echo.

echo Step 1: Checking Git repository...
git remote -v
if errorlevel 1 (
    echo ERROR: Not a git repository. Initialize git first:
    echo   git init
    echo   git add .
    echo   git commit -m "Initial commit"
    echo   git remote add origin YOUR_GITHUB_REPO_URL
    echo   git push -u origin main
    pause
    exit /b 1
)

echo.
echo Step 2: Generate production secrets...
echo.
echo JWT_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
echo.
echo SESSION_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
echo.
echo SAVE THESE SECRETS! You'll need them for Render configuration.
echo.

echo Step 3: Next steps...
echo.
echo 1. Push code to GitHub (if not done):
echo    git push origin main
echo.
echo 2. Deploy Backend to Render:
echo    - Go to https://render.com
echo    - Sign up with GitHub
echo    - Create New Web Service
echo    - Select your repository
echo    - Root Directory: backend
echo    - Add environment variables (use secrets above)
echo.
echo 3. Deploy Frontend to Vercel:
echo    - Go to https://vercel.com
echo    - Sign up with GitHub
echo    - Import your repository
echo    - Root Directory: frontend
echo    - Add environment variables
echo.
echo 4. Read PRODUCTION_DEPLOYMENT.md for detailed instructions
echo.

pause
