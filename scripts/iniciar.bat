@echo off
chcp 65001 >nul
cd /d "%~dp0.."

echo.
echo ========================================
echo   Tempovias — Iniciando
echo ========================================
echo.

echo [1/4] Verificando dependencias...
if not exist "node_modules" (
    echo Instalando dependencias do backend...
    call npm install
    if errorlevel 1 (
        echo ERRO: Falha no npm install do backend.
        pause
        exit /b 1
    )
)
if not exist "frontend\node_modules" (
    echo Instalando dependencias do frontend...
    pushd frontend
    call npm install
    if errorlevel 1 (
        popd
        echo ERRO: Falha no npm install do frontend.
        pause
        exit /b 1
    )
    popd
)

echo.
echo [2/4] Construindo frontend...
cd frontend
call npm run build
if errorlevel 1 (
    echo ERRO: Falha ao construir o frontend.
    pause
    exit /b 1
)
cd ..

echo.
echo [3/4] Iniciando backend com PM2...
call pm2 start ecosystem.config.js --update-env
if errorlevel 1 (
    echo ERRO: Falha ao iniciar com PM2.
    pause
    exit /b 1
)

echo.
echo [4/4] Salvando estado do PM2...
call pm2 save

echo.
echo ========================================
echo   Tempovias rodando!
echo   Acesse: http://localhost:3001
echo ========================================
echo.
pause
