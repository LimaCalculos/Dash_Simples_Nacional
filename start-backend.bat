@echo off
echo Iniciando Simples Dashboard - Backend...
cd /d "%~dp0backend"

if not exist ".env" (
    echo AVISO: .env nao encontrado. Copie .env.example para .env e configure.
    pause
    exit /b 1
)

if not exist "venv" (
    echo Criando ambiente virtual Python...
    python -m venv venv
)

call venv\Scripts\activate.bat

echo Instalando dependencias...
pip install -r requirements.txt -q

echo.
echo Iniciando servidor FastAPI na porta 8001...
echo Acesse: http://localhost:8001/docs
echo.
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
