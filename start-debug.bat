@echo off
rem Bridge from source with key tracing. Elevates first: without administrator rights
rem Windows UIPI silently discards SendInput when the game runs elevated, so keys leave
rem the bridge, appear in bridge.log, and never reach the game.
net session >nul 2>&1
if %errorlevel% neq 0 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
cd /d "%~dp0"
set TD_DEBUG=1
node bridge\server.js
pause
