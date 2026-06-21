param(
  [Parameter(Mandatory = $true)]
  [string]$Authtoken
)

$ErrorActionPreference = "Stop"
$ngrokExe = Join-Path $PSScriptRoot "tools\ngrok.exe"

if (-not (Test-Path $ngrokExe)) {
  & (Join-Path $PSScriptRoot "install-ngrok.ps1")
}

& $ngrokExe config add-authtoken $Authtoken.Trim()
Write-Host "ngrok authtoken saved." -ForegroundColor Green
Write-Host "Start public tunnel: .\run-ngrok.ps1" -ForegroundColor Cyan
