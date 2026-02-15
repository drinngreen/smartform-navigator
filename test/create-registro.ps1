param(
  [string]$BasePath = 'https://api.rentri.gov.it/anagrafiche/v1.0',
  [string]$NumIscrSito = 'OP2501RMK022692-PD00001',
  [string]$Descrizione = 'Test apertura registro via Bridge',
  [string]$Filename = 'certificato.p12',
  [string]$Issuer = '08934760961'
)

$ErrorActionPreference = 'Stop'
$bodyObj = [ordered]@{
  basePath   = $BasePath
  numIscrSito= $NumIscrSito
  attivita   = @('Produzione','Recupero')
  descrizione= $Descrizione
  filename   = $Filename
  issuer     = $Issuer
}
$json = $bodyObj | ConvertTo-Json -Compress
$res = Invoke-RestMethod -Method Post -Uri 'http://localhost:8765/create-registro' -ContentType 'application/json' -Body $json
Write-Host "[STATUS] $($res.status) success=$($res.success)"
if($res.data){ Write-Host "[BODY] $($res.data)" }