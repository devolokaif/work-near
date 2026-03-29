# WorkNear — Complete Platform Documentation
Bachelor's degree final year major project. <br>
Author - Muhammad Ubaid (AMU)

## Overview
WorkNear is a scalable labor marketplace platform (similar to Urban Company) connecting daily wage workers with employers. Built for thousands of requests per second.

## Tech Stack
- **Frontend**: React 18 + Vite + TailwindCSS + React Query + Zustand
- **Backend**: Node.js + Express + Socket.io (real-time tracking)
- **Database**: PostgreSQL 15 + Redis (caching/queues)
- **Payments**: Razorpay (India) / Stripe integration
- **Location**: Google Maps API + Socket.io real-time tracking
- **Android**: React Native (Expo)
- **Infrastructure**: Docker + Nginx + PM2

## Project Structure
```
WorkNear/
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── config/           # DB, Redis, env config
│   │   ├── middleware/        # Auth, rate limiting, validation
│   │   ├── modules/
│   │   │   ├── auth/          # JWT auth
│   │   │   ├── users/         # User management
│   │   │   ├── jobs/          # Job CRUD
│   │   │   ├── bookings/      # Booking flow
│   │   │   ├── payments/      # Payment processing
│   │   │   ├── tracking/      # Real-time location
│   │   │   ├── notifications/ # Push notifications
│   │   │   └── reviews/       # Ratings & reviews
│   │   ├── socket/            # Socket.io handlers
│   │   └── utils/             # Helpers
│   ├── prisma/                # DB schema & migrations
│   └── package.json
├── frontend/                  # React web app
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route pages
│   │   ├── stores/            # Zustand state
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # API calls
│   │   └── utils/
│   └── package.json
├── mobile/                    # React Native (Expo)
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── navigation/
│   │   └── services/
│   └── package.json
├── docker-compose.yml
└── nginx.conf
```

## Quick Start
```bash
# 1. Clone and install
git clone <repo>
cd WorkNear

# 2. Start infrastructure
docker-compose up -d postgres redis

# 3. Backend
cd backend
npm install
npx prisma migrate dev
npm run dev

# 4. Frontend
cd frontend
npm install
npm run dev

# 5. Mobile
cd mobile
npm install
npx expo start
```
