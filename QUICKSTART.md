# WikiDoCollab — Quickstart

This file shows minimal steps to run the app locally (development). It assumes a POSIX shell (macOS/Linux) and Node.js/npm installed.

## Prerequisites

- Node.js 18+ and npm
- MongoDB (local `mongod` or a MongoDB Atlas URI)

## Backend (API + Socket.IO)

1. Open a terminal and install dependencies:

```bash
cd backend
npm install
```

2. Create a `.env` file in `backend/` with at least:

```
MONGODB_URI=mongodb://localhost:27017/wikidocollab
JWT_SECRET=replace_with_a_long_secret
JWT_REFRESH_SECRET=replace_with_a_different_secret
PORT=5000
```

3. Start the backend in dev mode (hot-reloads):

```bash
npm run dev
```

The backend listens on `http://localhost:5112` by default.

## Frontend (Vite)

1. In a new terminal, install frontend deps:

```bash
cd frontend
npm install
```

2. (Optional) Create `frontend/.env` to override API base for local dev:

```
VITE_API_BASE=http://localhost:5173
```

3. Start the frontend dev server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

## Create a test user (example)

Register a user via the API (replace email/password as needed):

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password","displayName":"Test User"}'
```

Login to obtain an access token:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

The login response contains an access token you can store as `accessToken` in `sessionStorage`/`localStorage` for the frontend.

## Useful commands

- Backend dev: `cd backend && npm run dev` (uses `nodemon`)
- Backend start: `cd backend && npm start`
- Frontend dev: `cd frontend && npm run dev`
- Frontend build: `cd frontend && npm run build`

See `backend/package.json` and `frontend/package.json` for scripts.

## Notes

- If you use MongoDB Atlas, set `MONGODB_URI` to the provided connection string.
- The app uses JWTs; keep secrets secure in production and rotate them as appropriate.
- Socket authentication uses the same JWT (`Authorization: Bearer <token>`).

If you'd like, I can add `.env.example` files to both `backend/` and `frontend/` with these values.
