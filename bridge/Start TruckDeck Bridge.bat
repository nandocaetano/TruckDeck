@echo off
rem TruckDeck Bridge launcher.
rem The bridge must run elevated: when the game runs as administrator, Windows UIPI
rem silently discards SendInput from a non-elevated process -- the panel connects,
rem the buttons light up, and nothing reaches the game. No error is reported.
net session >nul 2>&1
if %errorlevel% neq 0 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~dp0TruckDeckBridge.exe' -Verb RunAs"
  exit /b
)
"%~dp0TruckDeckBridge.exe"
