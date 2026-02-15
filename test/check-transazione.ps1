param(
  [string]$TransazioneId,
  [string]$RegistryId = "R6QSWHZ6HJV",
  [string]$Filename = "certificato.p12",
  [string]$Issuer = "08934760961"
)

$uri = "http://localhost:8765/check-status"
$body = @{ api = "dati-registri"; transazioneId = $TransazioneId; filename = $Filename; issuer = $Issuer } | ConvertTo-Json -Depth 5

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