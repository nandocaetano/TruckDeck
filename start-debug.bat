@echo off
rem Starts the bridge from source with key tracing. Temporary diagnostic helper.
cd /d "%~dp0"
set TD_DEBUG=1
node bridge\server.js
pause
