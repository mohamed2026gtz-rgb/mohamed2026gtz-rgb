# Downloads ngrok into .\tools\ (one-time setup)
$ErrorActionPreference = "Stop"
$toolsDir = Join-Path $PSScriptRoot "tools"
$ngrokExe = Join-Path $toolsDir "ngrok.exe"

if (Test-Path $ngrokExe) {
  Write-Host "ngrok already installed: $ngrokExe" -ForegroundColor Green
  & $ngrokExe version
  exit 0
}

Write-Host "Downloading ngrok..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
$zip = Join-Path $toolsDir "ngrok.zip"
Invoke-WebRequest -Uri "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip" -OutFile $zip -UseBasicParsing
Expand-Archive -Path $zip -DestinationPath $toolsDir -Force
Remove-Item $zip -Force

Write-Host "Installed:" -ForegroundColor Green
& $ngrokExe version
Write-Host ""
Write-Host "Next: run .\setup-ngrok.ps1 -Authtoken YOUR_TOKEN" -ForegroundColor Yellow
Write-Host "Get a free token at https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Yellow
