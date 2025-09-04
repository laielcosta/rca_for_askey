@echo off
setlocal EnableDelayedExpansion
:: run.bat ─ punto de entrada para testers
:: Versión mejorada con mejor manejo de dependencias

pushd "%~dp0"

echo.
echo ================================================
echo   Channel Availability Test - Launcher
echo ================================================
echo.

:: 1 · Verificar si Node.js está instalado y en la versión correcta
where node >nul 2>nul
if errorlevel 1 (
    echo [INFO] Node.js no encontrado. 
    goto :install_deps
)

:: Verificar versión de Node.js
for /f "tokens=1" %%i in ('node -v 2^>nul') do set NODE_VERSION=%%i
if "%NODE_VERSION%"=="" (
    echo [ERROR] No se pudo obtener la versión de Node.js
    goto :install_deps
)

:: Extraer número de versión mayor
set VERSION_NUM=%NODE_VERSION:v=%
for /f "tokens=1 delims=." %%a in ("%VERSION_NUM%") do set MAJOR_VERSION=%%a

if %MAJOR_VERSION% LSS 18 (
    echo [INFO] Node.js versión %NODE_VERSION% encontrada, pero se requiere v18 o superior.
    goto :install_deps
)

echo [OK] Node.js %NODE_VERSION% detectado.

:: 2 · Verificar si las dependencias están instaladas
if not exist "node_modules\" (
    echo [INFO] Dependencias de Node.js no encontradas.
    goto :install_deps
)

if not exist "node_modules\puppeteer\" (
    echo [INFO] Puppeteer no encontrado en node_modules.
    goto :install_deps
)

:: 3 · Verificar si Chromium está disponible para Puppeteer
echo [INFO] Verificando instalación de Chromium...
echo const puppeteer = require('puppeteer'); ^
(async () =^> { ^
  try { ^
    const browser = await puppeteer.launch({ headless: true }); ^
    await browser.close(); ^
    console.log('CHROMIUM_OK'); ^
  } catch (error) { ^
    console.log('CHROMIUM_ERROR'); ^
  } ^
})(); > temp_chromium_check.js

for /f %%i in ('node temp_chromium_check.js 2^>nul') do set CHROMIUM_STATUS=%%i
del temp_chromium_check.js >nul 2>nul

if not "%CHROMIUM_STATUS%"=="CHROMIUM_OK" (
    echo [INFO] Chromium no está disponible o presenta problemas.
    goto :install_deps
)

echo [OK] Chromium está disponible.
goto :run_script

:install_deps
echo.
echo [INFO] Instalando/actualizando dependencias...
echo Este proceso puede tardar varios minutos...
echo.

:: Ejecutar el script de PowerShell con mejor manejo de errores
powershell -ExecutionPolicy Bypass -NoProfile -Command "& { try { & '%~dp0install_deps.ps1' -ErrorAction Stop; exit $LASTEXITCODE } catch { Write-Error $_.Exception.Message; exit 1 } }"
set INSTALL_EXIT_CODE=%ERRORLEVEL%

if %INSTALL_EXIT_CODE% NEQ 0 (
    echo.
    echo [ERROR] La instalación de dependencias falló con código %INSTALL_EXIT_CODE%
    echo.
    echo Soluciones posibles:
    echo 1. Ejecutar como Administrador si es la primera instalación
    echo 2. Verificar conexión a internet
    echo 3. Instalar manualmente Node.js desde https://nodejs.org/
    echo 4. Ejecutar: npx puppeteer browsers install chrome
    echo.
    pause
    goto :cleanup
)

echo [OK] Dependencias instaladas correctamente.

:run_script
echo.
echo [INFO] Iniciando el script principal...
echo.

:: 4 · Lanzar el script principal
node channels.js %*
set SCRIPT_EXIT_CODE=%ERRORLEVEL%

echo.
if %SCRIPT_EXIT_CODE% EQU 0 (
    echo [INFO] Script ejecutado correctamente.
) else (
    echo [ERROR] El script terminó con código de error %SCRIPT_EXIT_CODE%
    echo.
    echo Si el error está relacionado con Chromium, intenta ejecutar:
    echo   npx puppeteer browsers install chrome
    echo.
)

:cleanup
echo.
pause
popd
endlocal