@echo off
echo Iniciando Simples Dashboard - Frontend...
cd /d "%~dp0frontend"

if not exist ".env" (
    echo AVISO: .env nao encontrado. Copie .env.example para .env e configure VITE_GOOGLE_CLIENT_ID.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Instalando dependencias npm...
    npm install
)

echo.
echo Iniciando servidor Vite na porta 5174...
echo Acesse: http://localhost:5174
echo.
npm run dev
