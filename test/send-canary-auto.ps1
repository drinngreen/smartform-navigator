param(
  [string]$RegistryId = "R6QSWHZ6HJV",
  [int]$Anno = 2025,
  [string]$Filename = "certificato.p12",
  [string]$Issuer = "08934760961",
  [string]$Data = (Get-Date -Format "yyyy-MM-dd'T'00:00:00Z"),
  [string]$CER = "170405",
  [double]$Quantita = 1.0,
  [string]$UM = "kg"
)

$ErrorActionPreference = "Stop"

$payload = @(
  @{
    riferimenti = @{
      numero_registrazione = @{ anno = $Anno }
      data_ora_registrazione = $Data
      causale_operazione = "RE"
    }
    rifiuto = @{
      codice_eer = $CER
      stato_fisico = "S"
      quantita = @{ valore = $Quantita; unita_misura = $UM }
      provenienza = "U"
    }
  }
) | ConvertTo-Json -Compress

$body = @{
  url = "https://api.rentri.gov.it/dati-registri/v1.0/operatore/$RegistryId/movimenti"
  payload = $payload
  filename = $Filename
  issuer = $Issuer
} | ConvertTo-Json -Compress

$res = Invoke-RestMethod -Method Post -Uri "http://localhost:8765/send-rentri" -ContentType "application/json" -Body $body
if ($res) { $res | ConvertTo-Json -Depth 10 }
