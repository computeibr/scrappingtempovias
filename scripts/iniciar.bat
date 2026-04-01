@echo off
chcp 65001 >nul
cd /d "%~dp0.."

echo.
echo ========================================
echo   Tempovias — Iniciando
echo ========================================
echo.

echo [1/3] Construindo frontend...
cd frontend
call npm run build
if errorlevel 1 (
    echo ERRO: Falha ao construir o frontend.
    pause
    exit /b 1
)
cd ..

echo.
echo [2/3] Iniciando backend com PM2...
call pm2 start ecosystem.config.js --update-env
if errorlevel 1 (
    echo ERRO: Falha ao iniciar com PM2.
    pause
    exit /b 1
)

echo.
echo [3/3] Salvando estado do PM2...
call pm2 save

echo.
echo ========================================
echo   Tempovias rodando!
echo   Acesse: http://localhost:3001
echo ========================================
echo.
pause
