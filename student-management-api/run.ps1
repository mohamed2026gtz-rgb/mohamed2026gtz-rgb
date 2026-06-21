$port = 5103
$root = $PSScriptRoot

Write-Host "Stopping API / nodemon on port $port..." -ForegroundColor Cyan

# Stop nodemon + node processes started from this API folder (avoids zombie respawn)
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue |
  ForEach-Object {
    if ($_.CommandLine -and $_.CommandLine -like "*$root*") {
      Write-Host "  Stopping node PID $($_.ProcessId)"
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
  }

Get-Process -Name "nodemon" -ErrorAction SilentlyContinue |
  ForEach-Object {
    Write-Host "  Stopping nodemon PID $($_.Id)"
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
  }

# Stop anything still listening on the port
Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object {
    $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    if ($proc) {
      Write-Host "  Stopping $($proc.ProcessName) on port $port (PID $($proc.Id))"
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }

Start-Sleep -Seconds 3

$still = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($still) {
  Write-Host "Port $port is still in use. Run this, then try again:" -ForegroundColor Red
  Write-Host "  Get-NetTCPConnection -LocalPort $port | ForEach-Object { Stop-Process -Id `$_.OwningProcess -Force }" -ForegroundColor Yellow
  exit 1
}

Set-Location $root
Write-Host "Starting API on http://0.0.0.0:$port ..." -ForegroundColor Green
npm run dev
