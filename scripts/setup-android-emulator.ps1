# Run once before using the Android emulator.
# Requires: API running on port 5103, Android emulator started, adb on PATH.

$port = 5103
$ruleName = "StudentManagementAPI-$port"

Write-Host "=== Student Management API — Android emulator setup ===" -ForegroundColor Cyan

# 1. Windows Firewall — allow inbound TCP on API port
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $existing) {
    Write-Host "Adding firewall rule for TCP $port..."
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port | Out-Null
} else {
    Write-Host "Firewall rule already exists."
}

# 2. adb reverse — maps emulator localhost:5103 -> PC localhost:5103
$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
    $sdkAdb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
    if (Test-Path $sdkAdb) { $adb = $sdkAdb }
}

if ($adb) {
    $adbExe = if ($adb -is [string]) { $adb } else { $adb.Source }
    $devices = & $adbExe devices 2>&1 | Select-String "device$"
    if ($devices) {
        Write-Host "Running adb reverse tcp:$port tcp:$port ..."
        & $adbExe reverse "tcp:$port" "tcp:$port"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "adb reverse OK. Emulator can also use http://127.0.0.1:$port" -ForegroundColor Green
        }
    } else {
        Write-Host "No Android emulator/device detected. Start the emulator first, then run this script again." -ForegroundColor Yellow
    }
} else {
    Write-Host "adb not found. Install Android SDK platform-tools or add adb to PATH." -ForegroundColor Yellow
    Write-Host "Without adb reverse, use http://10.0.2.2:$port inside the emulator app only." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "  - http://10.0.2.2:$port works ONLY inside the Android emulator, NOT in your PC browser."
Write-Host "  - On PC browser use: http://localhost:$port/health"
Write-Host ""
Write-Host "Start API:  cd StudentManagementAPI; dotnet run --launch-profile http"
Write-Host "Test URLs in emulator app:" -ForegroundColor Green
Write-Host "  1. http://10.0.2.2:$port"
Write-Host "  2. http://127.0.0.1:$port  (after adb reverse)"
