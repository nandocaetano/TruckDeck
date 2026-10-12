@echo off
rem Builds a test APK (debug) of the Android app and opens the folder it lands in.
rem For Google Play use Android Studio: Build > Generate Signed App Bundle.
cd /d "%~dp0"
if not exist local.properties (
  rem Android Studio's default SDK location; edit local.properties if yours is elsewhere
  echo sdk.dir=%LOCALAPPDATA:\=/%/Android/Sdk> local.properties
)
call gradlew.bat assembleDebug
if errorlevel 1 (
  echo.
  echo Build failed. Read the first error above.
  pause
  exit /b 1
)
explorer "app\build\outputs\apk\debug"
pause
