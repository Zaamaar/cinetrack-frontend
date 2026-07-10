# CineTrack — Frontend

Plain HTML/CSS/JS, no build step. Talks to the CineTrack API via `fetch`.

## Run locally
Just open `index.html` in a browser, or serve it:
```bash
npx serve .
```
Make sure `config.js` points at your running API (`http://localhost:3000` while developing).

## Deploy to Netlify

**Option A — CLI (fastest)**
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```
When prompted for a publish directory, point it at this folder.

**Option B — connect your GitHub repo**
```bash
gh repo create cinetrack-frontend --public --source=. --push
```
Then in the Netlify dashboard: "Add new site" → "Import from Git" → select the repo → deploy (no build command needed, publish directory is `.` or `/`).

## Before you deploy for real
1. Deploy the backend first (see `AWS_SETUP.md` in the API repo) and get your ALB's public DNS name.
2. Update `config.js`:
   ```js
   const API_BASE_URL = "http://your-alb-dns-name.us-east-1.elb.amazonaws.com";
   ```
3. On the backend, restrict CORS in `server.js` from `cors()` (allow-all) to your actual Netlify domain:
   ```js
   app.use(cors({ origin: "https://your-site.netlify.app" }));
   ```
   Wide-open CORS is fine for local testing but shouldn't ship to production — an interviewer who checks your `server.js` will notice if it's still allow-all.

## What to show off
- The live Netlify URL, in your resume and LinkedIn bio
- A quick screen recording: register → browse → add to watchlist → rate → change status
- The fact that frontend and backend are deployed completely independently — same separation of concerns a real product would use
