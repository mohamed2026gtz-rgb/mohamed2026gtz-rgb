# Stops any process already using port 5103, then starts the API.
$ErrorActionPreference = "Stop"
$port = 5103
$apiDir = Join-Path $PSScriptRoot "..\StudentManagementAPI"

Write-Host "Checking port $port..."
Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    ForEach-Object {
        $procId = $_.OwningProcess
        if ($procId -gt 0) {
            Write-Host "Stopping process $procId on port $port..."
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }

Get-Process -Name StudentManagementAPI -ErrorAction SilentlyContinue |
    ForEach-Object {
        Write-Host "Stopping $($_.ProcessName) (PID $($_.Id))..."
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }

Start-Sleep -Seconds 1

Push-Location $apiDir
try {
    Write-Host "Starting Student Management API on http://localhost:$port ..."
    dotnet run --launch-profile http
}
finally {
    Pop-Location
}
