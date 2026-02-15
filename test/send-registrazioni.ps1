param(
  [string]$RequestFile = 'test/send-registrazioni-R6QSWHZ6HJV.json'
)

$ErrorActionPreference = 'Stop'
$json = Get-Content -Raw $RequestFile
$res = Invoke-RestMethod -Method Post -Uri 'http://localhost:8765/send-registrazioni' -ContentType 'application/json' -Body $json
Write-Host "[STATUS] $($res.status) success=$($res.success)"
if($res.data){ Write-Host "[BODY] $($res.data)" }