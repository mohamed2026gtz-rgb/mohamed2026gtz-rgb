# Start API + web admin, then expose BOTH via ngrok (one ngrok process, two HTTPS URLs).
$ErrorActionPreference = "Stop"
$apiPort = 5103
$adminPort = 5173
$apiRoot = $PSScriptRoot
$adminRoot = Join-Path (Split-Path $apiRoot -Parent) "student-management-admin"
$ngrokExe = Join-Path $apiRoot "tools\ngrok.exe"
$configFile = Join-Path $apiRoot "ngrok-tunnels.yml"
$defaultConfig = Join-Path $env:LOCALAPPDATA "ngrok\ngrok.yml"

if (-not (Test-Path $ngrokExe)) {
  $installScript = Join-Path $apiRoot "install-ngrok.ps1"
  & $installScript
}

function Test-PortListening([int]$Port) {
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Get-NgrokUrls {
  try {
    return Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -UseBasicParsing
  } catch {
    return $null
  }
}

if (-not (Test-PortListening $apiPort)) {
  Write-Host "Starting API on port $apiPort ..." -ForegroundColor Cyan
  Start-Process powershell -ArgumentList @("-NoExit", "-Command", "Set-Location '$apiRoot'; npm run dev") | Out-Null
  $deadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $deadline) { if (Test-PortListening $apiPort) { break }; Start-Sleep 1 }
}

if (-not (Test-PortListening $adminPort)) {
  Write-Host "Starting web admin on port $adminPort ..." -ForegroundColor Cyan
  Start-Process powershell -ArgumentList @("-NoExit", "-Command", "Set-Location '$adminRoot'; npm run dev -- --host") | Out-Null
  $deadline = (Get-Date).AddSeconds(40)
  while ((Get-Date) -lt $deadline) { if (Test-PortListening $adminPort) { break }; Start-Sleep 1 }
}

Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Starting ngrok tunnels (api + admin) ..." -ForegroundColor Cyan
$ngrokLog = Join-Path $apiRoot "ngrok-all.log"
$ngrokArgs = @("start", "--all", "--log=stdout")
if (Test-Path $defaultConfig) {
  $ngrokArgs += "--config=$defaultConfig"
}
$ngrokArgs += "--config=$configFile"

$ngrokProc = Start-Process -FilePath $ngrokExe -ArgumentList $ngrokArgs `
  -RedirectStandardOutput $ngrokLog -PassThru -WindowStyle Hidden

$apiUrl = $null
$adminUrl = $null
$deadline = (Get-Date).AddSeconds(30)
while ((Get-Date) -lt $deadline) {
  $data = Get-NgrokUrls
  if ($data) {
    foreach ($t in $data.tunnels) {
      if ($t.name -eq "api" -and $t.public_url -like "https://*") { $apiUrl = $t.public_url }
      if ($t.name -eq "admin" -and $t.public_url -like "https://*") { $adminUrl = $t.public_url }
    }
  }
  if ($apiUrl -and $adminUrl) { break }
  if ($ngrokProc.HasExited) { break }
  Start-Sleep -Seconds 1
}

if (-not $adminUrl) {
  if (Test-Path $ngrokLog) { Get-Content $ngrokLog -Tail 25 }
  Write-Host "ngrok failed to start both tunnels." -ForegroundColor Red
  Write-Host "If auth failed, run: .\setup-ngrok.ps1 -Authtoken YOUR_TOKEN" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " WEB ADMIN (other computer browser):" -ForegroundColor Green
Write-Host "   $adminUrl" -ForegroundColor White
if ($apiUrl) {
  Write-Host " API (mobile app / optional override):" -ForegroundColor Green
  Write-Host "   $apiUrl" -ForegroundColor White
}
Write-Host "========================================" -ForegroundColor Green
Write-Host "ngrok dashboard: http://127.0.0.1:4040" -ForegroundColor DarkGray
Write-Host 'Keep this window open. Press Ctrl+C to stop ngrok.' -ForegroundColor Yellow

try {
  while (-not $ngrokProc.HasExited) { Start-Sleep 2 }
} finally {
  if (-not $ngrokProc.HasExited) {
    Stop-Process -Id $ngrokProc.Id -Force -ErrorAction SilentlyContinue
  }
}