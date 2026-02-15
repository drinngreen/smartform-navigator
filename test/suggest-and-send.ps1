param(
  [string]$RegistryId = 'R1DDEWC3SHU',
  [string]$Issuer = '08934760961',
  [string]$Filename = 'certificato.p12'
)

$ErrorActionPreference = 'Stop'
$suggestReq = @{ registryId=$RegistryId; filename=$Filename; issuer=$Issuer } | ConvertTo-Json -Compress
$suggestRes = Invoke-RestMethod -Method Post -Uri 'http://localhost:8765/suggest-next' -ContentType 'application/json' -Body $suggestReq
Write-Host "[SUGGEST] date=$($suggestRes.data.date) anno=$($suggestRes.data.anno) prog=$($suggestRes.data.progressivo)"

$payloadObj = [ordered]@{
  data_movimento = $suggestRes.data.date
  tipo_movimento = 'CA'
  causale = 'RE'
  descrizione = 'Invio test suggerito'
  numero_registrazione = @{ anno = $suggestRes.data.anno; progressivo = $suggestRes.data.progressivo }
  rifiuto = @{ codice_eer = '17.04.07'; quantita = 1.0; unita_misura = 'kg' }
  note = 'Prg: TEST'
}
$payloadJson = $payloadObj | ConvertTo-Json -Compress

$sendBody = @{ url = "https://api.rentri.gov.it/dati-registri/v1.0/operatore/$RegistryId/movimenti"; payload = $payloadJson; filename = $Filename; issuer = $Issuer } | ConvertTo-Json -Compress
$sendRes = Invoke-RestMethod -Method Post -Uri 'http://localhost:8765/send-rentri' -ContentType 'application/json' -Body $sendBody
Write-Host "[SEND] status=$($sendRes.status) success=$($sendRes.success)"
if($sendRes.data){ Write-Host "[BODY] $($sendRes.data)" }