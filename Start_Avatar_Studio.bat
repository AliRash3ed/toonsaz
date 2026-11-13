@echo off
setlocal
cd /d "%~dp0avatar"

powershell -NoProfile -Command "try { if ((Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3010/api/status -TimeoutSec 1).StatusCode -eq 200) { exit 0 } } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto open

start "ToonSaz Server" /min cmd /c "npm run library > library-server.log 2>&1"

for /l %%I in (1,1,30) do (
  powershell -NoProfile -Command "try { if ((Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3010/api/status -TimeoutSec 1).StatusCode -eq 200) { exit 0 } } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 goto open
  timeout /t 1 /nobreak >nul
)

echo ToonSaz could not start. Opening the server log.
if exist library-server.log start "" notepad.exe library-server.log
pause
exit /b 1

:open
start "" "http://127.0.0.1:3010/library.html"
endlocal
