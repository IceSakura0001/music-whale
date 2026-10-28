@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 22 or newer from https://nodejs.org
  pause
  exit /b 1
)
echo Muse Grid: http://127.0.0.1:4317
node scripts/start-local.mjs
pause
