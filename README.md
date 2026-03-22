# Study Buddy Starter

Starter structure for a clean Study Buddy project with:
- `index.html` launcher
- `game/` for Words, Reading, Math pages
- `server/` for API + auth + uploads + WebSocket multiplayer
- SQLite for local data
- Sharp for image compression
- ready structure to swap local uploads to R2 later

## Structure

- `index.html` main launcher
- `game/` static game pages
- `server/` Node backend

## Run backend

```bash
cd server
npm install
npm run dev
```

Backend runs on `http://localhost:8080`

## Run frontend

You can open `index.html` directly for simple navigation, but for local module imports it is better to serve the root folder with a static server.

Example:

```bash
npx serve .
```

or

```bash
python -m http.server 5500
```

Then open:
- `http://localhost:5500/index.html`

## Default API endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/lessons`
- `POST /api/lessons`
- `POST /api/uploads/lesson-image`
- `GET /api/progress/:childId`
- `POST /api/progress/save`

## WebSocket

- local: `ws://localhost:8080`
- production later: `wss://api.yourdomain.com`

## Notes

- Images are stored locally in `server/storage/uploads`
- SQLite DB file is in `server/storage/data/studybuddy.db`
- Later you can move uploads to Cloudflare R2 without changing the frontend much
