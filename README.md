<div align="center">

# 🇮🇳 – 🇵🇰 Conflict Tracker

A full-stack app that aggregates **Reddit live threads + megathread comments** and **curated RSS headlines** about the ongoing India-Pakistan conflict, then serves them through a single JSON endpoint and a lightweight dashboard.

![Render Deploy](https://img.shields.io/badge/Backend-Render-blue?logo=render)
![Vercel Deploy](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## ⚡ Key Features
| Layer | Highlights |
|-------|------------|
| **Server (Node/Express)** | • _Script-type_ OAuth via **snoowrap** for Reddit<br>• Fetches comments from two megathreads, a true /live thread, and flair-filtered posts<br>• Grabs RSS feeds from BBC, Al Jazeera, ToI, NDTV, Geo News, etc. with **rss-parser**<br>• **5-minute in-memory cache** (keeps well under Reddit's 60-req/min rule)<br>• Single endpoint **/reddit** returns everything in one JSON blob |
| **Client (Vanilla JS + CSS)** | • One-click refresh or auto-refresh<br>• Accordion UI for Reddit comments, live updates, flair posts, and RSS headlines<br>• Client-side keyword filter to show only conflict-related RSS items |
| **Deployment** | • Backend on **Render** (automatic HTTPS, port provided via $PORT)<br>• Frontend on **Vercel** (static build)<br>• CORS locked down to Vercel domain |

---

## 🏗️ Architecture

```
┌────────────┐      HTTPS       ┌─────────────────────┐
│  Vercel    │  ─────────────▶ │  Render (Express)   │
│  Frontend  │                 │  /reddit endpoint    │
└────────────┘ ◀─────────────  └─────────────────────┘
      ▲  JSON                                ▲
      └───────────── Reddit + RSS ───────────┘
```

## 🚀 Quick Start

1. Clone & install
```bash
git clone https://github.com/<your-org>/ind-pak-war-tracker.git
cd ind-pak-war-tracker/server
npm install
```

2. Environment variables  
Create server/.env:

```env
CLIENT_ID=xxxxxxxxxxxxxxxx
CLIENT_SECRET=xxxxxxxxxxxxxxxx
REDDIT_USERNAME=your_bot
REDDIT_PASSWORD=********
USER_AGENT=ind-pak-track
```
Create a Reddit "script" app → https://www.reddit.com/prefs/apps  
Use http://localhost as the redirect URI; credentials go in .env.

3. Run locally
```bash
# in /server
npm start          # Express on http://localhost:8080

# in /client
npm install        # only if you added a build tool
npx serve .        # or any static server on http://localhost:3000
```
The dashboard will call http://localhost:8080/reddit.

## 🛠️ Project Structure
```
.
├── client/           # static dashboard (index.html, styles.css, main.js)
└── server/
    ├── server.js     # Express API (this repo)
    └── .env.example
```

## 📝 API Reference
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /reddit | Returns { fetched_at, worldnewsComments, indiaComments, liveUpdates, flairWorldnewsPosts, rss: { world, india, pakistan } } |

All timestamps are milliseconds since epoch (easy to feed into JS Date()).

## 🧩 Frontend Options
The demo dashboard is pure HTML/CSS/JS for zero-config hosting, but the endpoint can just as easily power:

- A React/Vue/Svelte widget
- A mobile app (Flutter, React Native)
- Server-sent events / WebSocket stream

## 🏗️ Deployment

### Render (Backend)
- New → Web Service
- Public Git repo → root /server
- Build command: npm install
- Start command: node server.js
- Add environment variables from .env
- Leave Port blank (Render injects $PORT)

### Vercel (Frontend)
- Import Project → root /client
- Framework preset: Other (static)
- Deployment triggers on main branch

## 📌 Roadmap / TODO
- [ ] Switch cache to Redis for horizontal scaling
- [ ] Add WebSocket push for live updates
- [ ] Dark-mode toggle
- [ ] Cypress / Playwright e2e tests

## 🤝 Contributing
Fork the repo & create your branch:
```bash
git checkout -b feature/something
```

Commit your changes & push:
```bash
git commit -m "Add cool feature"
git push origin feature/something
```

Open a pull request!

## ⚖️ License
MIT © 2025 Your Name

Feel free to copy, fork, and build on it – just keep the license.

## 🙏 Acknowledgements
- snoowrap – Reddit API wrapper
- rss-parser – dead-simple RSS parsing
- Render & Vercel – zero-ops deployments
- All journalists & Redditors providing ground-truth updates
