@echo off
setlocal
cd /d "%~dp0"
pwsh -NoProfile -File ".\run_ocr_auto.ps1"
pause

