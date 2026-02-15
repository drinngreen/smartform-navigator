param(
  [string]$RegistryId = 'R6QSWHZ6HJV',
  [string]$Issuer = '08934760961',
  [string]$Filename = 'certificato.p12'
)

$ErrorActionPreference = 'Stop'
$eers = @('17.04.07','17.04.05','15.01.04','15.01.06','15.01.10')
$states = @('S','SP')
$prov = @('U','S')
$acts = @('R4','R12','R13')
$prog = 10
$day = [DateTime]::Parse('2025-10-01')

foreach($eer in $eers){
  foreach($st in $states){
    foreach($pv in $prov){
      foreach($act in $acts){
        $prog++
        $date = $day.AddDays($prog-10).ToString('yyyy-MM-dd') + 'T12:00:00Z'
        $payload = @(
          @{ 
            riferimenti = @{ numero_registrazione = @{ anno = 2025; progressivo = $prog }; data_ora_registrazione = $date; causale_operazione = 'RE' }
            rifiuto = @{ codice_eer = $eer; stato_fisico = $st; provenienza = $pv; quantita = @{ valore = 1.0; unita_misura = 'kg' }; destinato_attivita = $act }
            annotazioni = "test $eer $st $pv $act"
          }
        ) | ConvertTo-Json -Compress

        $body = @{ url = "https://api.rentri.gov.it/dati-registri/v1.0/operatore/$RegistryId/movimenti"; payload = $payload; filename = $Filename; issuer = $Issuer } | ConvertTo-Json -Compress
        Write-Host "[TRY] eer=$eer stato=$st prov=$pv attivita=$act prog=$prog date=$date"
        try {
          $res = Invoke-RestMethod -Method Post -Uri 'http://localhost:8765/send-registrazioni' -ContentType 'application/json' -Body $body
          Write-Host "[RESULT] status=$($res.status) success=$($res.success)"
          if($res.success){ Write-Host "[ACCEPTED] $eer $st $pv $act"; exit 0 }
          if($res.data){ Write-Host "[BODY] $($res.data)" }
        } catch {
          Write-Host "[ERROR] $($_.Exception.Message)"
        }
      }
    }
  }
}
exit 1