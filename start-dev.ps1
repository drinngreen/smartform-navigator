param()
$bridgeDir = Join-Path $PSScriptRoot 'bridge-service'
$webDir = $PSScriptRoot
Start-Process -FilePath 'powershell' -ArgumentList "-NoLogo -NoExit -Command cd '$bridgeDir'; dotnet run --configuration Debug" -WorkingDirectory $bridgeDir
Start-Process -FilePath 'powershell' -ArgumentList "-NoLogo -NoExit -Command cd '$webDir'; npm run dev" -WorkingDirectory $webDir
Write-Output 'Bridge: http://localhost:8765'
Write-Output 'UI+API: http://localhost:3001'
