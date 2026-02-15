param(
  [string]$JsonPath = "test/send-first-movimento-R6QSWHZ6HJV.json"
)

$json = Get-Content -Raw -Path $JsonPath | ConvertFrom-Json
$uri = "http://localhost:8765/send-registrazioni"

try {
  $res = Invoke-RestMethod -Method Post -Uri $uri -ContentType 'application/json' -Body ($json | ConvertTo-Json -Depth 6)
  if ($res) { $res | ConvertTo-Json -Depth 10 }
} catch {
  Write-Output $_.Exception.Message
  if ($_.Exception.Response) {
    $reader = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd() | Write-Output
  }
}