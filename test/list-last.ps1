param(
  [string]$RegistryId = 'R1DDEWC3SHU',
  [string]$Issuer = '08934760961'
)

$ErrorActionPreference = 'Stop'
$url = "https://api.rentri.gov.it/dati-registri/v1.0/operatore/$RegistryId/movimenti?limit=1&order=desc"
$body = @{ url = $url; filename = 'certificato.p12'; issuer = $Issuer } | ConvertTo-Json -Compress
Write-Host "[LIST] $url"
$res = Invoke-RestMethod -Method Post -Uri 'http://localhost:8765/list-rentri' -ContentType 'application/json' -Body $body
Write-Host "[RES] status=$($res.status) success=$($res.success)"
if($res.data){ Write-Host "[BODY] $($res.data)" }