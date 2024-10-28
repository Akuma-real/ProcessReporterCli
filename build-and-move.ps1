# Check and request admin privileges if needed
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Requesting administrator privileges..." -ForegroundColor Yellow
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

# Set encoding to UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Set strict mode and error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Define paths
$targetPath = "C:\ProcessReporterCli"
$sourcePath = $PSScriptRoot

function Write-Step {
    param (
        [Parameter(Mandatory)]
        [string]$Message
    )
    Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor Cyan
}

function Test-CommandExists {
    param (
        [string]$Command
    )
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Check-Prerequisites {
    Write-Step "Checking prerequisites..."
    
    # Check Node.js
    if (-not (Test-CommandExists "node")) {
        throw "Node.js is not installed. Please install Node.js from https://nodejs.org/"
    }
    Write-Host "  Node.js found: $(node --version)" -ForegroundColor Green
    
    # Check Yarn
    if (-not (Test-CommandExists "yarn")) {
        throw "Yarn is not installed. Please install Yarn using 'npm install -g yarn'"
    }
    Write-Host "  Yarn found: $(yarn --version)" -ForegroundColor Green
    
    # Check .env file
    if (-not (Test-Path (Join-Path $sourcePath ".env"))) {
        throw ".env file not found. Please create .env file in the project root"
    }
    Write-Host "  .env file found" -ForegroundColor Green
}

try {
    # Check prerequisites
    Check-Prerequisites
    
    # Prepare target directory
    Write-Step "Preparing target directory..."
    if (Test-Path $targetPath) {
        Write-Host "  Removing existing directory..." -ForegroundColor Yellow
        Remove-Item -Path $targetPath -Recurse -Force
    }
    
    # Copy entire project directory
    Write-Step "Copying project files..."
    $excludeItems = @(
        # Version Control
        '.git',
        '.github',
        
        # IDE and Editor files
        '.vscode',
        '.idea',
        '*.tsbuildinfo',
        
        # Build scripts
        'build-and-move.ps1',
        'build-and-move.bat',
        'run-build.bat',
        
        # Dependencies
        'node_modules',
        '/node_modules',
        '.yarn',
        '.pnp.cjs',
        '.pnp.loader.mjs',
        
        # Build outputs
        'dist',
        '/build',
        '/lib',
        'logs',
        
        # Debug files
        '*.log',
        'npm-debug.log*',
        'yarn-debug.log*',
        'yarn-error.log*',
        '.pnpm-debug.log*',
        
        # Environment and local files
        '.env*.local',
        'data.db',
        
        # Misc
        '.DS_Store',
        '*.pem',
        '*.png'
    )
    
    $null = New-Item -ItemType Directory -Path $targetPath -Force
    
    Get-ChildItem -Path $sourcePath -Exclude $excludeItems | 
    ForEach-Object {
        Write-Host "  Copying $($_.Name)..." -ForegroundColor Yellow
        Copy-Item -Path $_.FullName -Destination $targetPath -Recurse -Force
    }

    # Copy .env file separately
    Write-Host "  Copying .env file..." -ForegroundColor Yellow
    Copy-Item -Path (Join-Path $sourcePath ".env") -Destination $targetPath -Force
    
    # Show success message
    Write-Host "`n=================================" -ForegroundColor Green
    Write-Host "Files copied successfully!" -ForegroundColor Green
    Write-Host "Location: $targetPath" -ForegroundColor Green
    Write-Host "=================================" -ForegroundColor Green
    
    # Create a temporary script file for building
    $tempScriptPath = Join-Path $targetPath "temp-build.ps1"
    @"
Set-Location '$targetPath'
Write-Host 'Installing dependencies...' -ForegroundColor Yellow
yarn install --ignore-engines
if (`$?) {
    Write-Host 'Building project...' -ForegroundColor Yellow
    yarn run build
    if (`$?) {
        Write-Host 'Copying .env to dist directory...' -ForegroundColor Yellow
        Copy-Item -Path '.env' -Destination 'dist\.env' -Force
        
        Write-Host 'Creating start script...' -ForegroundColor Yellow
        @'
@echo off
cd /d "%~dp0"
node index.js
'@ | Out-File -FilePath 'dist\start.bat' -Encoding utf8 -NoNewline
        
        Write-Host 'Build completed successfully!' -ForegroundColor Green
    }
}
Write-Host 'Press any key to exit...' -ForegroundColor Yellow
`$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
"@ | Out-File -FilePath $tempScriptPath -Encoding UTF8

    # Start new PowerShell window with the script
    Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $tempScriptPath -Wait:$false

} catch {
    # Error handling
    Write-Host "`n[ERROR] An error occurred!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "Stack trace:" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed
} finally {
    # Ensure script doesn't exit immediately
    Write-Host "`nPress any key to exit..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
