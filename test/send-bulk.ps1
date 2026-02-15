param(
  [string]$RegistryId = "R6QSWHZ6HJV",
  [string]$Filename = "certificato.p12",
  [string]$Issuer = "08934760961",
  [int]$Count = 3,
  [string]$StartProgressivo = "0000001",
  [string]$Anno = (Get-Date).Year.ToString(),
  [string]$Date = (Get-Date).ToString('yyyy-MM-dd')
)

function IncProg($p){
  $d = ($p.ToCharArray() | Where-Object { $_ -match '\d' }) -join ''
  $w = $p.Length
  $n = [int]$d + 1
  return $n.ToString("D$w")
}

$payloads = @()
$prog = $StartProgressivo
for ($i=0; $i -lt $Count; $i++) {
  $mov = @{
    riferimenti = @{
      numero_registrazione = @{ anno = [int]$Anno; progressivo = $prog }
      data_ora_registrazione = "$Date" + "T12:00:00Z"
      causale_operazione = "RE"
    }
    rifiuto = @{
      codice_eer = "170405"
      stato_fisico = "S"
      quantita = @{ valore = 5.0; unita_misura = "kg" }
    }
    annotazioni = "Bulk test $prog"
  }
  $payloads += $mov
  $prog = IncProg $prog
}

$uri = "http://localhost:8765/send-registrazioni"
$body = @{ url = "https://api.rentri.gov.it/dati-registri/v1.0/operatore/$RegistryId/movimenti"; filename = $Filename; issuer = $Issuer; payload = ($payloads | ConvertTo-Json -Depth 6) } | ConvertTo-Json -Depth 6

try {
  $res = Invoke-RestMethod -Method Post -Uri $uri -ContentType 'application/json' -Body $body
  if ($res) { $res | ConvertTo-Json -Depth 10 }
} catch {
  Write-Output $_.Exception.Message
  if ($_.Exception.Response) {
    $reader = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd() | Write-Output
  }
}