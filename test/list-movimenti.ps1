param(
  [string]$RegistryId = "R1DDEWC3SHU",
  [string]$Filename = "certificato.p12",
  [string]$Issuer = "",
  [int]$Limit = 5,
  [string]$Order = "desc"
)

$uri = "http://localhost:8765/list-movimenti"
$body = @{ registryId = $RegistryId; filename = $Filename; issuer = $Issuer; limit = $Limit; order = $Order } | ConvertTo-Json -Depth 5

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