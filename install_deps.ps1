<#
 install_deps.ps1
 ----------------
 • Instala Node.js (si falta) mediante winget, Chocolatey o MSI oficial.
 • Comprueba que la versión sea ≥ 18.
 • Instala o reinstala (-Force) las dependencias definidas en package-lock.json.
 • NUEVO: Instala el navegador Chromium necesario para Puppeteer.

 Uso:
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File install_deps.ps1 [-Force]
#>

param(
    [switch]$Force   # Reinstalar dependencias aunque exista node_modules
)

#------------------------------------------------------------
#  Funciones auxiliares
#------------------------------------------------------------
function Test-Admin {
    $p = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $p.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

function Install-NodeWithWinget {
    Write-Host "Trying to install Node.js LTS with winget..."
    winget install -e --id OpenJS.NodeJS.LTS -h --accept-package-agreements --accept-source-agreements
    return $LASTEXITCODE
}

function Install-NodeWithChocolatey {
    Write-Host "Trying to install Node.js LTS with Chocolatey..."
    choco install nodejs-lts -y --no-progress
    return $LASTEXITCODE
}

function Install-NodeFromMsi {
    $temp = [IO.Path]::GetTempFileName() -replace '\.tmp$', '.msi'
    $nodeVersion = "22.2.0"   # Cambia a la versión que prefieras
    $url = "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-x64.msi"
    Write-Host "Downloading Node.js MSI..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $temp -UseBasicParsing
        Write-Host "Installing Node.js silently..."
        Start-Process msiexec.exe -Wait -ArgumentList "/i `"$temp`" /qn /norestart"
        $exitCode = $LASTEXITCODE
        Remove-Item $temp -ErrorAction SilentlyContinue
        return $exitCode
    } catch {
        Write-Error "Failed to download or install Node.js: $_"
        Remove-Item $temp -ErrorAction SilentlyContinue
        return 1
    }
}

function Install-PuppeteerBrowser {
    Write-Host ""
    Write-Host "Installing Chromium browser for Puppeteer..."
    
    # Método 1: Usar el comando npx puppeteer browsers install chrome
    try {
        $result = npx puppeteer browsers install chrome 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Chromium installed successfully via npx puppeteer."
            return $true
        } else {
            Write-Warning "npx puppeteer method failed: $result"
        }
    } catch {
        Write-Warning "npx puppeteer method failed: $_"
    }

    # Método 2: Usar node para ejecutar el script de instalación
    try {
        $installScript = @"
const puppeteer = require('puppeteer');
(async () => {
  try {
    console.log('Downloading Chromium...');
    const browser = await puppeteer.launch();
    console.log('Chromium downloaded and tested successfully!');
    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('Error installing Chromium:', error.message);
    process.exit(1);
  }
})();
"@
        $scriptPath = Join-Path $ScriptDir "temp_install_chromium.js"
        $installScript | Out-File -FilePath $scriptPath -Encoding UTF8
        
        Write-Host "Installing Chromium via Node.js script..."
        node $scriptPath
        $nodeExitCode = $LASTEXITCODE
        Remove-Item $scriptPath -ErrorAction SilentlyContinue
        
        if ($nodeExitCode -eq 0) {
            Write-Host "Chromium installed successfully via Node.js script."
            return $true
        } else {
            Write-Warning "Node.js script method failed with exit code: $nodeExitCode"
        }
    } catch {
        Write-Warning "Node.js script method failed: $_"
        Remove-Item $scriptPath -ErrorAction SilentlyContinue
    }

    # Método 3: Instalación manual usando la cache de Puppeteer
    try {
        Write-Host "Attempting manual Chromium installation..."
        $env:PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = ""
        npm install puppeteer --force
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Chromium should now be available."
            return $true
        }
    } catch {
        Write-Warning "Manual installation method failed: $_"
    }

    Write-Error "All Chromium installation methods failed. Puppeteer may not work correctly."
    return $false
}

#------------------------------------------------------------
#  Encabezado
#------------------------------------------------------------
Write-Host ""
Write-Host "---------------------------------------------"
Write-Host "  Channel availability - Dependency installer "
Write-Host "---------------------------------------------"
Write-Host ""

# Cambiar al directorio del script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

#------------------------------------------------------------
#  1. Asegurar Node.js
#------------------------------------------------------------
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {

    Write-Host "Node.js not found."

    if (-not (Test-Admin)) {
        Write-Warning "This script must run as Administrator to install Node.js automatically."
        Write-Warning "Run PowerShell as Administrator and launch this script again."
        exit 1
    }

    $installed = $false

    # Método 1: winget
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        if (Install-NodeWithWinget -eq 0) { $installed = $true }
    }

    # Método 2: Chocolatey
    if (-not $installed -and (Get-Command choco -ErrorAction SilentlyContinue)) {
        if (Install-NodeWithChocolatey -eq 0) { $installed = $true }
    }

    # Método 3: descarga MSI
    if (-not $installed) {
        if (Install-NodeFromMsi -eq 0) { $installed = $true }
    }

    if (-not $installed) {
        Write-Error "Automatic Node.js installation failed."
        exit 1
    }

    Write-Host "Node.js installed successfully."
    # Refrescar PATH para la sesión actual
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Validar Node.js
try { $nodeVersion = node -v } catch { $nodeVersion = $null }
if (-not $nodeVersion) {
    Write-Error "Node.js is still not visible in this session. Open a new PowerShell and rerun the script."
    exit 1
}
$major = [int](($nodeVersion.TrimStart('v')) -split '\.')[0]
if ($major -lt 18) {
    Write-Warning "Node.js version $nodeVersion detected, but version 18 or later is required."
    exit 1
}
Write-Host "Node.js $nodeVersion detected."

# Comprobar npm
try { $npmVersion = npm -v } catch { $npmVersion = $null }
if (-not $npmVersion) {
    Write-Error "npm command not available even after Node.js installation."
    exit 1
}
Write-Host "npm $npmVersion detected."
Write-Host ""

#------------------------------------------------------------
#  2. Instalar dependencias del proyecto
#------------------------------------------------------------
$nodeModulesPath = Join-Path $ScriptDir "node_modules"

if (-not (Test-Path $nodeModulesPath) -or $Force) {
    Write-Host "Installing project dependencies (this may take a while)..."
    
    # Asegurar que Puppeteer descargue Chromium
    $env:PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = ""
    
    npm ci --loglevel error
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm ci failed with code $LASTEXITCODE."
        exit $LASTEXITCODE
    }
    Write-Host ""
    Write-Host "Dependencies installed successfully."
} else {
    Write-Host "Dependencies already present. Use -Force to reinstall."
}

#------------------------------------------------------------
#  3. NUEVO: Verificar y instalar el navegador Chromium
#------------------------------------------------------------
Write-Host ""
Write-Host "Checking Chromium installation for Puppeteer..."

# Verificar si Chromium ya está instalado
$chromiumTest = @"
const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch({ headless: true });
    await browser.close();
    console.log('CHROMIUM_OK');
    process.exit(0);
  } catch (error) {
    console.log('CHROMIUM_MISSING');
    process.exit(1);
  }
})();
"@

$testScriptPath = Join-Path $ScriptDir "temp_test_chromium.js"
$chromiumTest | Out-File -FilePath $testScriptPath -Encoding UTF8

try {
    $testResult = node $testScriptPath 2>&1
    Remove-Item $testScriptPath -ErrorAction SilentlyContinue
    
    if ($testResult -match "CHROMIUM_OK") {
        Write-Host "Chromium is already installed and working."
    } else {
        Write-Host "Chromium not found or not working. Installing..."
        $browserInstalled = Install-PuppeteerBrowser
        if (-not $browserInstalled) {
            Write-Warning "Chromium installation failed. The script may not work properly."
        }
    }
} catch {
    Remove-Item $testScriptPath -ErrorAction SilentlyContinue
    Write-Host "Could not test Chromium installation. Attempting to install..."
    $browserInstalled = Install-PuppeteerBrowser
}

Write-Host ""
Write-Host "Environment ready. You can now run channels.js."
Write-Host ""
Write-Host "If you encounter issues with Chromium, you can manually install it by running:"
Write-Host "  npx puppeteer browsers install chrome"
Write-Host ""
exit 0