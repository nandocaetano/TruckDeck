@echo off
rem Starts the TruckDeck bridge. Double-click this file on the gaming PC.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Install the LTS version from https://nodejs.org and run this file again.
  pause
  exit /b 1
)
node bridge\server.js
pause
