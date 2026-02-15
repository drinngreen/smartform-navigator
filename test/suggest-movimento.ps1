param(
  [string]$RegistryId = 'R6QSWHZ6HJV',
  [string]$Filename = 'certificato.p12',
  [string]$Issuer = '08934760961',
  [string]$CER = '170405',
  [double]$Quantita = 1.0,
  [string]$UM = 'kg'
)

$ErrorActionPreference = 'Stop'
$sreq = @{ registryId = $RegistryId; filename = $Filename } | ConvertTo-Json -Compress
$sres = Invoke-RestMethod -Method Post -Uri 'http://localhost:8765/suggest-next' -ContentType 'application/json' -Body $sreq
$anno = [int]$sres.data.anno
$prog = [string]$sres.data.progressivo
$date = [string]$sres.data.date

$payload = @(
  @{
    riferimenti = @{
      numero_registrazione = @{ anno = $anno; progressivo = $prog }
      data_ora_registrazione = $date
      causale_operazione = 'RE'
    }
    rifiuto = @{
      codice_eer = $CER
      stato_fisico = 'S'
      quantita = @{ valore = $Quantita; unita_misura = $UM }
      provenienza = 'U'
    }
  }
) | ConvertTo-Json -Compress

$sendBody = @{
  url = "https://api.rentri.gov.it/dati-registri/v1.0/operatore/$RegistryId/movimenti"
  payload = $payload
  filename = $Filename
  issuer = $Issuer
} | ConvertTo-Json -Compress

$res = Invoke-RestMethod -Method Post -Uri 'http://localhost:8765/send-rentri' -ContentType 'application/json' -Body $sendBody
if ($res) { $res | ConvertTo-Json -Depth 10 }
