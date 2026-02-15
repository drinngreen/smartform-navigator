param(
  [string]$RegistryId = 'R1DDEWC3SHU',
  [string]$Issuer = '08934760961',
  [string]$DateString = '2025-09-30T12:00:00+02:00'
)

$ErrorActionPreference = 'Stop'
$baseUrl = "https://api.rentri.gov.it/dati-registri/v1.0/operatore/$RegistryId/movimenti"

$payloadObj = [ordered]@{
  data_movimento = $DateString
  tipo_movimento = 'CA'
  causale = 'RE'
  descrizione = 'Invio con data specifica'
  rifiuto = @{ codice_eer = '15.01.06'; quantita = 1.0; unita_misura = 'kg' }
  note = 'Prg: TEST'
}
$jsonPayload = $payloadObj | ConvertTo-Json -Compress
$bodyObj = [ordered]@{ url = $baseUrl; payload = $jsonPayload; filename = 'certificato.p12'; issuer = $Issuer }
$bodyJson = $bodyObj | ConvertTo-Json -Compress

Write-Host "[SEND] $DateString"
$res = Invoke-RestMethod -Method Post -Uri 'http://localhost:8765/send-rentri' -ContentType 'application/json' -Body $bodyJson
Write-Host "[RES] status=$($res.status) success=$($res.success)"
if($res.data){ Write-Host "[BODY] $($res.data)" }