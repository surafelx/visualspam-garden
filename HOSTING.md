# Hosting VisualSpam Garden

The app is a Vite + React client and an Express + MongoDB API. In production the
API server also serves the built client, so it deploys as **one service**.

## What you need
- Node 20+
- A MongoDB database (local, or MongoDB Atlas for cloud hosting)

## Environment variables (server)
- `MONGO_URI` — Mongo connection string (default `mongodb://127.0.0.1:27017/visualspam-garden`)
- `PORT` — port to listen on (default `4000`)
- `VITE_API_URL` *(client build, optional)* — only if the API is on a different
  origin than the client. Left unset, the client calls same-origin `/api`.

## One-service deploy (recommended)
```bash
npm install            # client deps
cd server && npm install && cd ..   # server deps
npm run build          # builds client into ./dist
MONGO_URI=<your-uri> npm start      # server serves ./dist AND /api on $PORT
```
Then point your host (Render/Railway/Fly/VPS) at `npm start` with `MONGO_URI` set.
Seed initial garden data once with `npm run seed`.

## Local development
```bash
npm run dev            # client on :5200, API on :4000 (concurrently)
```

## Notes
- API routes are wrapped so bad input returns a JSON 400 instead of hanging.
- Data (regions, logs, milestones, check-ins) persists in MongoDB. The day-plan
  schedule is stored client-side (localStorage) per day.
