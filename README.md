# 🐦 Perch

**Pull up a perch** — scan a QR at a cafe, join the chat room, browse the menu, order food. A venue-based social + ordering platform designed to enhance the dine-in experience for customers and streamline operations for restaurant staff.

---

## 🌟 Features

### For Customers (The Perch Experience)
- **Instant Access via QR**: Simply scan the QR code on your table to join the venue's digital space.
- **Real-Time Venue Chat**: Join a live chat room specific to the venue. Connect with other patrons, request songs, or chat with the staff.
- **Digital Menu & Cart**: Browse the dynamic menu, add items to your cart, and place orders directly from your phone.
- **Seamless Payments**: Support for multiple payment gateways including Razorpay and Cash on Delivery (COD).
- **Self-Pickup Options**: Support for self-pickup if a restaurant doesn't offer table service.
- **Live Order Tracking**: Get real-time updates on your order status directly from the kitchen.

### For Restaurants & Cafes
- **Multi-Tenant Architecture**: Manage multiple restaurants, each with multiple branches/venues under a single organization.
- **Superadmin & Owner Dashboards**: Comprehensive analytics, staff management, and venue controls.
- **Real-Time Kitchen Display**: Chefs receive orders instantly via WebSockets without needing to refresh.
- **Staff Management**: Role-based access control (Owners, Managers, Chefs, Waitstaff) with time-tracking/attendance (clock-in/out) and analytics.
- **Automated Workflows**: Automatic order assignments for Chefs and Waitstaff, including real-time push and chat notifications for order pickups.
- **Menu Management**: Easily update items, prices, and availability across different branches.
- **Moderation Tools**: Built-in chat moderation to maintain a safe and friendly environment in venue chat rooms.

---

## 🛠️ Tech Stack

Perch is built using a modern, scalable monorepo architecture:

### Frontend (`apps/web`)
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State/Data**: React Hooks, Fetch API
- **Auth**: NextAuth.js (Google OAuth + Credentials)

### Backend (`apps/api`)
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+)
- **Database**: MongoDB (via AsyncIOMotorClient)
- **ODM**: [Beanie](https://beanie-odm.dev/) (Pydantic-based ODM)
- **Cache & Pub/Sub**: Redis (for WebSocket broadcasting and rate limiting)
- **Real-Time**: WebSockets (Starlette)

---

## 🚀 Quick Start Guide

### Prerequisites
Before you begin, ensure you have the following installed:
- Docker & Docker Compose
- Python 3.11+
- Node.js 20+
- Git

### 1. Clone the Repository & Setup Infrastructure

```bash
git clone https://github.com/zovium/perch-zovium.git
cd perch-zovium

# Start MongoDB and Redis using Docker Compose
docker compose up -d mongo redis
```

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env` in the root directory.
2. Update the `.env` file with your specific configurations (e.g., `NEXTAUTH_SECRET`, `JWT_SECRET`, database URIs).

### 3. Start the Backend API

```bash
cd apps/api
python -m venv .venv

# Activate the virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed the database (Creates the default Super Admin)
python -m app.seed 

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
> **Note**: The seed script creates a default super admin. Check the console output for the generated credentials.

### 4. Start the Frontend Application

Open a new terminal window:

```bash
cd apps/web
npm install
npm run dev
```

### 5. Access the Platform

- **Customer App**: [http://localhost:3000](http://localhost:3000)
- **Admin Panel**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- **Interactive API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📱 Testing QR Codes & WebSockets with a Real Device

To test scanning QR codes and using the app from your mobile device, you need to expose your local server using a tunnel like `ngrok`:

```bash
# Start an ngrok tunnel on the frontend port
ngrok http 3000
```

1. Copy the generated HTTPS URL (e.g., `https://random-string.ngrok-free.dev`).
2. Update the `PUBLIC_BASE_URL` and `NEXTAUTH_URL` in your `.env` file to this ngrok URL.
3. Restart your Next.js and FastAPI servers.
4. Generate a QR code from the Admin Panel, scan it with your phone, and test the real-time chat and ordering!

---

## 📁 Project Structure

```text
perch/
├── apps/
│   ├── api/                  # Python FastAPI Backend
│   │   ├── app/
│   │   │   ├── core/         # DB, Config, Security, Redis logic
│   │   │   ├── domains/      # Domain-Driven Design modules (Auth, Chat, Menu, Orders, Venues)
│   │   │   │   ├── auth/     # User models, staff logic, authentication
│   │   │   │   ├── chat/     # WebSocket managers, moderation
│   │   │   │   ├── menu/     # Menu models and routers
│   │   │   │   ├── orders/   # Order lifecycle and payment
│   │   │   │   └── venues/   # Restaurant and branch hierarchies
│   │   │   └── services/     # Cross-domain services (Payments, Scheduling, Encryption)
│   │   └── requirements.txt
│   │
│   └── web/                  # Next.js 15 Frontend
│       ├── src/
│       │   ├── app/          # App Router
│       │   │   ├── (admin)/  # Superadmin and Restaurant Manager panels
│       │   │   └── (user)/   # Public-facing customer application
│       │   ├── components/   # Reusable UI components
│       │   ├── features/     # Feature-sliced components and API hooks
│       │   ├── hooks/        # Custom React hooks (e.g., useChatSocket)
│       │   └── lib/          # API clients, utilities
│       ├── package.json
│       └── tailwind.config.ts
├── docker-compose.yml        # Infrastructure definitions
└── .env                      # Unified environment variables
```

---

## 🛡️ Default Dev Credentials
If you run the `seed.py` script, the default development admin is usually set up as:
- **Email**: `superadmin@perch.store`
- **Password**: `admin123`
*(Check your terminal output during the seed process for exact credentials)*

> ⚠️ **SECURITY WARNING**: These credentials and the default JWT/NextAuth secrets are for local development ONLY. You must rotate and secure these before deploying to production.
