@echo off
rem Music Whale (鲸歌) desktop app launcher.
rem Keeps project data in this folder's .local so the desktop app, the dev
rem server and the MCP bridge all edit the same workbench.
cd /d "%~dp0"
set "MUSE_GRID_DATA=%CD%\.local"

if exist "release-installer\win-unpacked\Music Whale.exe" (
  start "" "release-installer\win-unpacked\Music Whale.exe"
  exit /b 0
)
if exist "release\Music Whale-win32-x64\Music Whale.exe" (
  start "" "release\Music Whale-win32-x64\Music Whale.exe"
  exit /b 0
)

where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 22 or newer from https://nodejs.org
  pause
  exit /b 1
)
if not exist "node_modules\electron\dist\electron.exe" (
  echo Muse Grid desktop runtime is not installed yet.
  echo Installing Electron from the npmmirror registry, about 100 MB...
  set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
  call npm install --registry=https://registry.npmmirror.com --no-audit --no-fund
  if errorlevel 1 (
    echo Electron install failed. Run npm install manually and retry.
    pause
    exit /b 1
  )
)
call npm run app
if errorlevel 1 pause

