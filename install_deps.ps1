<#
 install_deps.ps1
 ----------------
 • Instala Node.js (si falta) mediante winget, Chocolatey o MSI oficial.
 • Comprueba que la versión sea ≥ 18.
 • Instala o reinstala (-Force) las dependencias definidas en package-lock.json.

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
    Invoke-WebRequest -Uri $url -OutFile $temp
    Write-Host "Installing Node.js silently..."
    Start-Process msiexec.exe -Wait -ArgumentList "/i `"$temp`" /qn /norestart"
    Remove-Item $temp
    return $LASTEXITCODE
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

Write-Host ""
Write-Host "Environment ready. You can now run channels.js."
exit 0
