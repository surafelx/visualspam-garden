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
- `SERVE_CLIENT` — set to `false` to skip serving client files (for independent API hosting)

## One-service deploy (recommended)
```bash
npm install            # client deps
cd server && npm install && cd ..   # server deps
npm run build          # builds client into ./dist
MONGO_URI=<your-uri> npm start      # server serves ./dist AND /api on $PORT
```
Then point your host (Render/Railway/Fly/VPS) at `npm start` with `MONGO_URI` set.
Seed initial garden data once with `npm run seed`.

## Independent API hosting (Render)
Deploy only the `server/` directory as a separate service:

1. Create a new Web Service on Render
2. Point to the `server/` directory in your repo
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variable: `MONGO_URI=<your-atlas-uri>`
6. Add environment variable: `SERVE_CLIENT=false`

The API will be available at `https://your-service.onrender.com/api`.

## Local development
```bash
npm run dev            # client on :5200, API on :4000 (concurrently)
```

## Notes
- API routes are wrapped so bad input returns a JSON 400 instead of hanging.
- Data (regions, logs, milestones, check-ins) persists in MongoDB. The day-plan
  schedule is stored client-side (localStorage) per day.
