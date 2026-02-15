@echo off
echo ==========================================
echo   AVVIO BRIDGE RENTRI (Modalita' File)
echo ==========================================
echo.

:: 1. Chiude eventuali versioni vecchie bloccate
taskkill /F /IM dotnet.exe >nul 2>&1
taskkill /F /IM RentriBridgeService.exe >nul 2>&1

:: 2. Entra nella cartella corretta
cd bridge-service

:: 3. Avvia il programma
set ASPNETCORE_URLS=http://127.0.0.1:8765
dotnet run
pause
