# Deployment Guide — Render Web Service

This guide deploys StorySpark as a **Web Service** on Render, using a small Express server. This is the right choice if you plan to add a real LLM generation endpoint later (V2 in the roadmap), since you'll already have the server scaffolding in place.

If you'd rather deploy as a Static Site (no server, slightly simpler), see the bottom of this doc.

---

## What's in the repo

```
storyspark/
├── index.html, styles.css, app.js   # the frontend (unchanged)
├── server.js                        # tiny Express server
├── package.json                     # Node dependencies + start script
├── render.yaml                      # Render Blueprint (optional but nice)
├── README.md
└── docs/
```

The server does three things:
1. Serves the static files (`index.html`, `styles.css`, `app.js`)
2. Exposes `/healthz` so Render knows the service is alive
3. Has a stub `/api/generate` endpoint, ready for V2 (real LLM generation)

---

## Step 1 — Push to GitHub

From inside the project folder:

```bash
git init
git add .
git commit -m "Initial commit"
```

Create an empty repo at [github.com/new](https://github.com/new), then:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/storyspark.git
git push -u origin main
```

---

## Step 2 — Create the Web Service on Render

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. Click **New +** → **Web Service**.
3. Find your `storyspark` repo and click **Connect**.
4. Fill in the configuration:

| Field | Value |
|---|---|
| **Name** | `storyspark` (becomes your subdomain) |
| **Region** | Pick the one closest to your users (Oregon, Frankfurt, Singapore, Ohio) |
| **Branch** | `main` |
| **Root Directory** | *leave blank* |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | `Free` to start (upgrade later) |

5. Expand **Advanced** and set:
   - **Health Check Path**: `/healthz`
   - **Auto-Deploy**: `Yes`
   - **Environment Variables**: Add `NODE_ENV` = `production`

6. Click **Create Web Service**.

---

## Step 2 (alternative) — Deploy via render.yaml Blueprint

If you'd rather have all that config in code, the repo already includes a `render.yaml`. Instead of the manual steps:

1. Go to **New +** → **Blueprint**
2. Connect the `storyspark` repo
3. Render reads `render.yaml` and configures everything automatically
4. Click **Apply**

This is the better long-term choice — your deploy config is version-controlled.

---

## Step 3 — Wait for the build

Render will:
1. Clone the repo
2. Run `npm install` (takes ~30 seconds)
3. Run `npm start`
4. Hit `/healthz` to confirm the service responds
5. Mark the deploy as Live

You'll see logs streaming in the dashboard. When you see `StorySpark running on port 10000` (or similar), it's up.

Your URL will be `https://storyspark.onrender.com` (or whatever name you chose).

---

## Step 4 — Verify it works

Visit your URL in a browser — you should see the homepage. Then test the endpoints from your terminal:

```bash
# Health check
curl https://storyspark.onrender.com/healthz
# → {"status":"ok","uptime":42.123}

# API stub
curl -X POST https://storyspark.onrender.com/api/generate \
  -H "Content-Type: application/json" \
  -d '{"heroName":"Maya","theme":"Magical forest adventure","outcome":"Learns to be brave"}'
# → {"message":"Server is running...","received":{...}}
```

---

## Step 5 — Auto-deploy is on

Every push to `main` triggers a redeploy. To test:

```bash
# any change
git add .
git commit -m "Update copy"
git push
```

Watch the Render dashboard — a new deploy starts within seconds.

---

## Important: The Free plan sleeps

Render's free Web Service plan **spins down after 15 minutes of inactivity**. The next request takes ~30–60 seconds to wake the service back up. This is fine for development but bad for real traffic.

The fix: upgrade to the **Starter plan ($7/month)** before launching. The service stays warm 24/7 and you also get:
- Faster builds
- More CPU/memory
- Custom domain priority

If you want to stay free temporarily, you can use a service like UptimeRobot to ping `/healthz` every 10 minutes — but at that point the $7 is honestly cheaper than the workaround complexity.

---

## Step 6 (optional) — Custom domain

In your service's dashboard:

1. **Settings** → **Custom Domains** → **Add Custom Domain**
2. Enter your domain (e.g., `storyspark.co`)
3. Render gives you DNS records to add at your registrar:
   - **A record** for the apex pointing to Render's IP
   - **CNAME** for `www` pointing to `storyspark.onrender.com`
4. Wait 5–60 minutes for DNS. Render auto-issues SSL.

Verify with `dig storyspark.co +short`.

---

## When you add the LLM (V2)

The server is ready for it. When you're ready:

1. Get an Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
2. In Render dashboard: **Environment** → **Add Environment Variable**
   - Key: `ANTHROPIC_API_KEY`
   - Value: your key
   - Mark it as a **secret** (Render encrypts it)
3. In `server.js`, replace the `/api/generate` stub body with a real call to the Anthropic SDK
4. In `app.js`, replace the local `buildStory()` call with `fetch('/api/generate', ...)`
5. Push to main → auto-deploys

The frontend UI doesn't change at all. Only the data source.

---

## Troubleshooting

**Build fails: "Cannot find module 'express'"**
Your `package.json` is missing or malformed. Verify it's at the repo root and contains the `dependencies` block.

**Build succeeds but service crashes on start**
Check the logs in the Render dashboard. Most often: a typo in `server.js` or you forgot to `git push` `package.json`.

**Service is up but the site is blank**
Verify `index.html`, `styles.css`, and `app.js` are at the repo root (not nested in a folder). The server serves files from `__dirname`, which is the repo root.

**Health check fails repeatedly**
The service started but `/healthz` isn't responding. Either the route is missing in `server.js`, or the service crashed silently — check logs.

**Custom domain shows "Not Secure"**
Wait 10 more minutes after DNS verifies. Render provisions SSL after the domain resolves.

**Cold-start is slow on free plan**
This is the 15-minute sleep behavior described above. Upgrade to Starter ($7/mo) to fix permanently.

---

## Cost summary

| Plan | Cost | Best for |
|---|---|---|
| Free | $0 | Dev/staging, demos. Sleeps after 15 min idle. |
| Starter | $7/mo | Real traffic. Always on, faster builds. |
| Standard | $25/mo | More CPU/RAM. Probably overkill for this site for a long time. |

For a launching product, **Starter** is the right answer. You're already making money on the first hardcover sale of the month.

---

## Alternative: Deploy as a Static Site instead

If you don't need the server (yet) and want zero maintenance:

1. **New +** → **Static Site** instead of Web Service
2. Build command: *blank*
3. Publish directory: `.`
4. The Static Site plan is **free forever, never sleeps, no upgrade needed** — but you can't add backend endpoints.

Choose Web Service if you're planning V2 (LLM generation) within a few months. Choose Static Site if you want to validate demand first with the template-based MVP.

You can switch from Static Site to Web Service later by deleting and recreating the Render service — your repo doesn't need to change (the `server.js` and `package.json` just get ignored on the Static Site path).
