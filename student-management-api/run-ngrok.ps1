# Starts the API (if needed) and exposes it via ngrok HTTPS tunnel.
$ErrorActionPreference = "Stop"
$port = 5103
$ngrokExe = Join-Path $PSScriptRoot "tools\ngrok.exe"

if (-not (Test-Path $ngrokExe)) {
  & (Join-Path $PSScriptRoot "install-ngrok.ps1")
}

function Test-ApiListening {
  return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

function Get-NgrokPublicUrl {
  try {
    $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -UseBasicParsing
    foreach ($t in $tunnels.tunnels) {
      if ($t.public_url -like "https://*") {
        return $t.public_url
      }
    }
    if ($tunnels.tunnels.Count -gt 0) {
      return $tunnels.tunnels[0].public_url
    }
  } catch {
    return $null
  }
  return $null
}

# Stop old ngrok on this machine (optional clean start)
Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

if (-not (Test-ApiListening)) {
  Write-Host "API not running on port $port - starting in a new window..." -ForegroundColor Cyan
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$PSScriptRoot'; .\run.ps1"
  ) | Out-Null

  $deadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $deadline) {
    if (Test-ApiListening) { break }
    Start-Sleep -Seconds 1
  }

  if (-not (Test-ApiListening)) {
    Write-Host "API did not start on port $port. Start it manually: .\run.ps1" -ForegroundColor Red
    exit 1
  }
  Write-Host "API is listening on http://localhost:$port" -ForegroundColor Green
} else {
  Write-Host "API already listening on port $port" -ForegroundColor Green
}

Write-Host "Starting ngrok tunnel to port $port ..." -ForegroundColor Cyan
$ngrokLog = Join-Path $PSScriptRoot "ngrok.log"
$ngrokProc = Start-Process -FilePath $ngrokExe -ArgumentList "http", "$port", "--log=stdout" `
  -RedirectStandardOutput $ngrokLog -PassThru -WindowStyle Hidden

$publicUrl = $null
$deadline = (Get-Date).AddSeconds(25)
while ((Get-Date) -lt $deadline) {
  $publicUrl = Get-NgrokPublicUrl
  if ($publicUrl) { break }
  if ($ngrokProc.HasExited) { break }
  Start-Sleep -Seconds 1
}

if (-not $publicUrl) {
  if (Test-Path $ngrokLog) {
    Write-Host "--- ngrok log ---" -ForegroundColor DarkGray
    Get-Content $ngrokLog -Tail 20
  }
  Write-Host ""
  Write-Host "ngrok did not start. You need a free authtoken first:" -ForegroundColor Red
  Write-Host "  1. Sign up: https://dashboard.ngrok.com/signup" -ForegroundColor Yellow
  Write-Host "  2. Copy token: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Yellow
  Write-Host "  3. Run: .\setup-ngrok.ps1 -Authtoken YOUR_TOKEN" -ForegroundColor Yellow
  Write-Host "  4. Run this script again: .\run-ngrok.ps1" -ForegroundColor Yellow
  exit 1
}

$healthUrl = "$publicUrl/health"
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " PUBLIC API URL (use in mobile app):" -ForegroundColor Green
Write-Host "   $publicUrl" -ForegroundColor White
Write-Host " Health check:" -ForegroundColor Green
Write-Host "   $healthUrl" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Mobile app: Login, Server settings, paste URL above, Test connection" -ForegroundColor Cyan
Write-Host "ngrok dashboard: http://127.0.0.1:4040" -ForegroundColor DarkGray
Write-Host ""
Write-Host 'Keep this window open. Press Ctrl+C to stop ngrok.' -ForegroundColor Yellow

try {
  while (-not $ngrokProc.HasExited) {
    Start-Sleep -Seconds 2
  }
} finally {
  if (-not $ngrokProc.HasExited) {
    Stop-Process -Id $ngrokProc.Id -Force -ErrorAction SilentlyContinue
  }
}
