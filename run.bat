@echo off
:: run.bat ─ punto de entrada para testers
pushd "%~dp0"

:: 1 · Instalar Node si no existe
where node >nul 2>nul
if errorlevel 1 (
    echo [INFO] Node.js no encontrado. Ejecutando install_deps.ps1...
    powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0install_deps.ps1"
)

:: 2 · Lanzar el script principal
node channels.js %*
echo.
pause
popd
