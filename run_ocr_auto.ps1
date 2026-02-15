$ErrorActionPreference = 'Stop'
Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not (Test-Path 'out')) { New-Item -ItemType Directory -Path 'out' | Out-Null }
if (-not (Test-Path 'out\invio_massivo.log')) { New-Item -ItemType File -Path 'out\invio_massivo.log' | Out-Null }
function Get-NextProgressivo($registryId){
  $p='out\invio_massivo.log'; $next=0
  if (Test-Path $p){
    $lines=Get-Content $p
    foreach($l in $lines){ try { $j=$l | ConvertFrom-Json } catch { continue }
      if ($j.kind -eq 'RESULT' -and $j.accepted -eq 1 -and $j.registryId -eq $registryId){
        $prog=0
        if ($j.key -match '^2025_(\d+)$'){ $prog=[int]$Matches[1] }
        elseif ($j.body) { try { $b=$j.body|ConvertFrom-Json; $prog=[int]$b.esito.numero_registrazioni[0].progressivo } catch {} }
        if ($prog -gt $next) { $next=$prog }
      }
    }
  }
  if ($next -lt 8450) { $next=8450 }
  return ($next+1)
}
function TryUntilAccepted($base, [int]$tries){
  for ($i=0; $i -lt $tries; $i++){
    $start = $base + $i
    npm run ocr:build:payload -- --startGlobal $start --limit 1 | Out-Null
    $env:SEND_DELAY_MS='200'
    npm run send:ocr:global -- --limit 1 | Out-Null
    $last = Get-Content 'out\invio_massivo.log' | Select-Object -Last 2
    $accLine = ($last | Where-Object { $_ -like '*\"kind\":\"RESULT\"*' })
    if ($accLine) { try { $j=$accLine | ConvertFrom-Json } catch { $j=$null }
      if ($j -and $j.accepted -eq 1) { return $start }
    }
  }
  return 0
}
$base = Get-NextProgressivo 'R6QSWHZ6HJV'
$first = TryUntilAccepted $base 100
if ($first -gt 0) {
  npm run ocr:build:payload -- --startGlobal ($first + 1) --limit 50 | Out-Null
  $env:SEND_DELAY_MS='200'
  npm run send:ocr:global | Out-Null
  npx tsx server/scripts/exportAccepted.ts --out out\ocr.accepted.csv | Out-Null
  $objs = Get-Content 'out\invio_massivo.log' | % { try { $_ | ConvertFrom-Json } catch {} }
  $acc = $objs | ? { $_.kind -eq 'RESULT' -and $_.accepted -eq 1 }
  $tot = $acc.Count
  $last10 = $acc | Select-Object -Last 10 | % { $_ | ConvertTo-Json -Depth 3 }
  Set-Content -Path 'out\ocr.status.txt' -Value ("ACCEPTED_TOTAL="+$tot+"`n"+($last10 -join "`n"))
  Write-Output ("OK first_accepted="+$first+" total="+$tot)
} else {
  Set-Content -Path 'out\ocr.status.txt' -Value "NO_ACCEPTED_IN_TRY"
  Write-Output "NO_ACCEPTED_IN_TRY"
}
