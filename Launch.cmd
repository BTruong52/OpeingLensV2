@echo off
setlocal
cd /d "%~dp0"
set "LENS_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "LENS_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "node_modules\electron\cli.js" (
  echo Dependencies are missing. Run npm install first. See README.md.
  pause
  exit /b 1
)
"%LENS_NODE%" node_modules\electron\cli.js .
if errorlevel 1 pause
