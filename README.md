# Simples Dashboard — Lima Cálculos

Dashboard dinâmico para declarações PGDAS-D (Simples Nacional) com sincronização automática do Google Drive.

## 🎯 Funcionalidades

- **3 Abas de Análise:**
  - Visão Geral: KPIs totais + gráficos
  - Por Cliente: Filtros e detalhes por cliente
  - Mensal: Matriz de clientes × meses

- **Sincronização Automática:** A cada 5 minutos com Google Drive
- **Segurança:** Login via Google OAuth + email whitelist
- **Preparado para DAS:** Estrutura pronta para automação de guias de arrecadação

## 🛠️ Tech Stack

### Backend
- FastAPI
- SQLAlchemy + SQLite
- Google Drive API v3
- APScheduler
- Python 3.10+

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- TanStack Query
- Recharts

## 📋 Pré-requisitos

- Python 3.10+
- Node.js 18+
- Conta Google com acesso ao Google Drive
- Credenciais OAuth2 configuradas

## 🚀 Setup Local

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Editar .env com suas credenciais
uvicorn main:app --port 8001 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Acesse: `http://localhost:5174`

## 📦 Variáveis de Ambiente

Veja `.env.example` para referência.

## 📝 Licença

Propriedade de Lima Cálculos — 2026
