# Perch

**Pull up a perch** — scan a QR at a cafe, join the chat room, browse the menu, order food. A venue-based social + ordering platform.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI (Python 3.11+) |
| Database | MongoDB (via Motor + Beanie ODM) |
| Cache | Redis |
| Auth | NextAuth.js (Google + Credentials) |
| Payments | Simulated (Dummy + COD), Razorpay stub |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Node.js 20+

### 1. Start infrastructure

```bash
docker compose up -d mongo redis
```

### 2. Start the API

```bash
cd apps/api
python -m venv .venv
.venv/Scripts/activate      # Windows
pip install -r requirements.txt
python -m app.seed           # seeds dev admin: ram@admin.com / Ram@2003
uvicorn app.main:app --reload --port 8000
```

### 3. Start the frontend

```bash
cd apps/web
npm install
npm run dev
```

### 4. Access

- **User app**: http://localhost:3000
- **Admin panel**: http://localhost:3000/admin/login
- **API docs**: http://localhost:8000/docs

### QR Testing with a Real Phone

```bash
ngrok http 3000
# Copy the https URL → set PUBLIC_BASE_URL in .env → restart API
```

## Dev Admin Credentials

- **Email**: ram@admin.com
- **Password**: Ram@2003
- ⚠️ Local development only — rotate before any real deployment.

## Project Structure

```
perch/
├── apps/
│   ├── api/          # FastAPI backend
│   │   ├── app/
│   │   │   ├── core/       # config, db, security, redis
│   │   │   ├── models/     # Beanie documents
│   │   │   ├── schemas/    # Pydantic request/response
│   │   │   ├── routers/    # API endpoints
│   │   │   └── services/   # business logic
│   │   └── requirements.txt
│   └── web/          # Next.js frontend
│       ├── app/
│       │   ├── (user)/     # customer-facing pages
│       │   └── (admin)/    # admin panel pages
│       ├── components/
│       ├── hooks/
│       └── lib/
├── docker-compose.yml
└── .env.example
```
