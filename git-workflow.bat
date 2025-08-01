@echo off
echo ========================================
echo Git Workflow Helper Script
echo ========================================
echo.

echo Checking current branch...
git branch
echo.

echo Checking Git status...
git status
echo.

echo Pulling latest changes from master...
git pull origin master
echo.

echo Ready for your changes!
echo.
echo After making changes, run:
echo   git add .
echo   git commit -m "your commit message"
echo   git push origin master
echo.
echo ========================================
pause