@echo off
setlocal
cd /d "%~dp0"
if not exist out mkdir out
if exist out\invio_massivo.log (break> out\invio_massivo.log) else (type NUL > out\invio_massivo.log)
start "" /min cmd /c ".\avvia_bridge.bat"
start "" /min powershell -NoProfile -Command "npx tsx server/index.ts"
timeout /t 6 /nobreak >nul
echo ==== HEALTH CHECKS ====
powershell -NoProfile -Command "try { (Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:8765/health' -TimeoutSec 4 | ConvertTo-Json -Depth 2) } catch { Write-Output $_.Exception.Message }"
powershell -NoProfile -Command "try { (Invoke-RestMethod -Method Get -Uri 'http://localhost:3001/health' -TimeoutSec 4 | ConvertTo-Json -Depth 2) } catch { Write-Output $_.Exception.Message }"
call npm run ocr:build:payload -- --startGlobal 8455 --limit 1
set SEND_DELAY_MS=200
call npm run send:ocr:global -- --limit 1
echo ==== LAST 20 LOG LINES ====
powershell -NoProfile -Command "Get-Content out\invio_massivo.log | Select-Object -Last 20"
pause

