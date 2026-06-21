# Run from this folder:  .\run.ps1
# Stops any old API instance on port 5103, then starts the server.
$port = 5103

Write-Host "Freeing port $port if needed..."
Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    ForEach-Object {
        if ($_.OwningProcess -gt 0) {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }

Get-Process -Name StudentManagementAPI -ErrorAction SilentlyContinue |
    Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 1

Write-Host "Starting API at http://localhost:$port ..."
dotnet run --launch-profile http
