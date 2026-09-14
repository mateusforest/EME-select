@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 22.16 ou superior para abrir a previa local.
  pause
  exit /b 1
)
echo Abra http://127.0.0.1:4191 no navegador.
node scripts/serve.mjs
pause
