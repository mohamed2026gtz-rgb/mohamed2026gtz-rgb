# Expose the web admin (Vite) via ngrok so other computers can open it in a browser.
# The API stays on localhost:5103; Vite proxies /api to the API (no second URL needed).
$ErrorActionPreference = "Stop"
$adminPort = 5173
$apiPort = 5103
$root = $PSScriptRoot
$ngrokExe = Join-Path (Split-Path $root -Parent) "student-management-api\tools\ngrok.exe"

if (-not (Test-Path $ngrokExe)) {
  & (Join-Path (Split-Path $root -Parent) "student-management-api\install-ngrok.ps1")
}

function Test-PortListening([int]$Port) {
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Get-NgrokTunnelUrl([string]$Name) {
  try {
    $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -UseBasicParsing
    foreach ($t in $tunnels.tunnels) {
      if ($t.name -eq $Name -and $t.public_url -like "https://*") {
        return $t.public_url
      }
    }
    foreach ($t in $tunnels.tunnels) {
      if ($t.config.addr -like "*:$adminPort" -and $t.public_url -like "https://*") {
        return $t.public_url
      }
    }
  } catch {
    return $null
  }
  return $null
}

if (-not (Test-PortListening $apiPort)) {
  Write-Host "API not running on port $apiPort - starting in a new window..." -ForegroundColor Cyan
  $apiRoot = Join-Path (Split-Path $root -Parent) "student-management-api"
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$apiRoot'; npm run dev"
  ) | Out-Null

  $deadline = (Get-Date).AddSeconds(30)
  while ((Get-Date) -lt $deadline) {
    if (Test-PortListening $apiPort) { break }
    Start-Sleep -Seconds 1
  }

  if (-not (Test-PortListening $apiPort)) {
    Write-Host "API did not start. Run student-management-api\run.ps1 first." -ForegroundColor Red
    exit 1
  }
}

if (-not (Test-PortListening $adminPort)) {
  Write-Host "Web admin not running on port $adminPort - starting in a new window..." -ForegroundColor Cyan
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$root'; npm run dev -- --host"
  ) | Out-Null

  $deadline = (Get-Date).AddSeconds(40)
  while ((Get-Date) -lt $deadline) {
    if (Test-PortListening $adminPort) { break }
    Start-Sleep -Seconds 1
  }

  if (-not (Test-PortListening $adminPort)) {
    Write-Host "Admin dev server did not start. Run: npm run dev -- --host" -ForegroundColor Red
    exit 1
  }
}

Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Starting ngrok tunnel to web admin port $adminPort ..." -ForegroundColor Cyan
$ngrokLog = Join-Path $root "ngrok-web.log"
$ngrokProc = Start-Process -FilePath $ngrokExe -ArgumentList "http", "$adminPort", "--log=stdout" `
  -RedirectStandardOutput $ngrokLog -PassThru -WindowStyle Hidden

$publicUrl = $null
$deadline = (Get-Date).AddSeconds(25)
while ((Get-Date) -lt $deadline) {
  $publicUrl = Get-NgrokTunnelUrl "command_line"
  if ($publicUrl) { break }
  if ($ngrokProc.HasExited) { break }
  Start-Sleep -Seconds 1
}

if (-not $publicUrl) {
  if (Test-Path $ngrokLog) { Get-Content $ngrokLog -Tail 20 }
  Write-Host "ngrok failed. Configure token: student-management-api\setup-ngrok.ps1 -Authtoken YOUR_TOKEN" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " WEB ADMIN URL (open on any computer):" -ForegroundColor Green
Write-Host "   $publicUrl" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "On the other computer: paste the URL above in Chrome/Edge." -ForegroundColor Cyan
Write-Host "Leave API server URL empty on login (uses built-in proxy)." -ForegroundColor Cyan
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
