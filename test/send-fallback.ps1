param(
  [string]$RegistryId = 'R1DDEWC3SHU',
  [string]$Issuer = '08934760961'
)

$ErrorActionPreference = 'Stop'
$baseUrl = "https://api.rentri.gov.it/dati-registri/v1.0/operatore/$RegistryId/movimenti"

function New-Payload($dateStr){
  return [ordered]@{
    data_movimento = $dateStr
    tipo_movimento = 'CA'
    causale = 'RE'
    descrizione = 'Invio fallback automatico'
    rifiuto = @{ codice_eer = '15.01.06'; quantita = 1.0; unita_misura = 'kg' }
    note = 'Prg: TEST'
  }
}

$dates = @()
$baseDate = Get-Date
for($i=0; $i -le 30; $i++){
  $d = $baseDate.AddDays(-$i).ToString('yyyy-MM-dd') + 'T12:00:00+01:00'
  $dates += $d
}

foreach($d in $dates){
  $payloadObj = New-Payload $d
  $jsonPayload = $payloadObj | ConvertTo-Json -Compress
  $bodyObj = [ordered]@{
    url = $baseUrl
    payload = $jsonPayload
    filename = 'certificato.p12'
    issuer = $Issuer
  }
  $bodyJson = $bodyObj | ConvertTo-Json -Compress
  Write-Host "[TRY] $d"
  try{
    $res = Invoke-RestMethod -Method Post -Uri 'http://localhost:8765/send-rentri' -ContentType 'application/json' -Body $bodyJson
    Write-Host "[RES] status=$($res.status) success=$($res.success)"
    if($res.success){ Write-Host "[OK] Accettato con data $d"; break }
    if($res.data){
      try{
        $err = $res.data | ConvertFrom-Json
        $dm = $err.model_state.data_movimento
        if($err.status -eq 400 -and $dm -and ($dm -contains 'sys.invalid')){ Write-Host "[INFO] data non valida, ritento"; continue }
        Write-Host "[BODY] $($res.data)"; break
      } catch {
        Write-Host "[BODY RAW] $($res.data)"; break
      }
    }
  } catch {
    Write-Host "[ERROR] $($_.Exception.Message)"; break
  }
}