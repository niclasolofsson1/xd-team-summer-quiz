@echo off
cd /d "%~dp0"
echo Starting XD Team Summer Gathering Quiz...
echo.
echo Building the player app...
call npm run build
if errorlevel 1 goto failed
echo.
node server.js
goto done
:failed
echo.
echo The build failed. Run "npm install" first if you haven't.
:done
echo.
echo Server stopped. Press any key to close this window.
pause >nul
