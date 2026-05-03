# Deployment Guide — GitHub + Render

This site is a fully static site (HTML, CSS, vanilla JS). No build step, no server, no environment variables. Deployment takes about 5 minutes.

---

## Step 1 — Push to GitHub

If you haven't already, create a new GitHub repo. From the project folder:

```bash
# Initialize the repo
git init
git add .
git commit -m "Initial commit — StorySpark MVP"

# Create a repo on github.com/new (e.g. "storyspark"), then:
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/storyspark.git
git push -u origin main
```

The repo should look like this on GitHub:

```
storyspark/
├── README.md
├── index.html
├── styles.css
├── app.js
└── docs/
    ├── MARKETING.md
    ├── MONETIZATION.md
    ├── MRR_ESTIMATIONS.md
    ├── DEPLOYMENT.md
    └── PRODUCT_ROADMAP.md
```

---

## Step 2 — Connect to Render

1. Go to **[render.com](https://render.com)** and sign in (free tier works fine for this).
2. Click **New +** → **Static Site**.
3. Connect your GitHub account if you haven't, and select the `storyspark` repo.
4. Configure the deployment:

   | Field | Value |
   |---|---|
   | **Name** | `storyspark` (or whatever you want — becomes your URL) |
   | **Branch** | `main` |
   | **Root directory** | *(leave blank)* |
   | **Build command** | *(leave blank — no build step)* |
   | **Publish directory** | `.` (just a single dot — the repo root) |

5. Click **Create Static Site**.

Render will deploy it in ~30 seconds. You'll get a URL like `https://storyspark.onrender.com`.

---

## Step 3 — Custom domain (optional)

Once you have a real domain (e.g. `storyspark.co`):

1. In Render, open your site's dashboard → **Settings** → **Custom Domains** → **Add Custom Domain**.
2. Enter your domain. Render gives you DNS records.
3. Add the records in your domain registrar (Namecheap, Cloudflare, GoDaddy, etc.):
   - Apex (`storyspark.co`): an `A` record pointing to Render's IP
   - `www` subdomain: a `CNAME` to `storyspark.onrender.com`
4. Wait 5–60 min for DNS propagation. Render auto-issues an SSL cert.

---

## Step 4 — Auto-deploy on push

Render is already set up for this. **Every push to `main` automatically redeploys.** That's it.

For more control, work in branches and only merge to `main` when ready:

```bash
git checkout -b feature/new-theme
# ...make changes
git push origin feature/new-theme
# open a PR on GitHub, merge when ready → auto-deploys
```

---

## Step 5 — Environment-aware code (when you add a backend)

When the MVP graduates to using a real LLM (see `PRODUCT_ROADMAP.md`), you'll add a backend. Two options:

### Option A — Render Web Service (recommended)

Add a Node.js / Python backend in a `server/` folder. In Render:

1. **New +** → **Web Service** → same repo
2. Root directory: `server`
3. Build command: `npm install`
4. Start command: `node index.js`
5. Add env vars: `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, etc.

The frontend stays as-is and calls `https://storyspark-api.onrender.com/generate`.

### Option B — Render Static Site + Cloudflare Workers / Vercel Functions

Keep Render for the static site, host the API elsewhere. This is what you'd do if you want to keep your generation endpoint on a different infra (e.g., for cost reasons).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Site loads but fonts don't | Check the `<link>` to Google Fonts in `index.html` is intact. |
| Form submits but nothing happens | Open dev tools → Console. Almost always a JS error in `app.js`. |
| Render build fails | Make sure publish directory is `.` (a single dot), not blank or `/`. |
| Custom domain not resolving | Verify DNS with `dig storyspark.co +short` — should return Render's IP. Wait longer if needed. |
| Static assets 404 on a custom path | Render serves from publish directory root — keep paths relative (no leading `/` in your HTML). |

---

## Cost

- **Render free tier**: covers this static site indefinitely. 100 GB bandwidth/month.
- **Render Starter** ($7/mo): adds custom domain priority + faster builds. Worth it once you're earning money.
- **Render Pro** ($25/mo): unnecessary for a static site. Only consider when you add backends.

---

## Backups

Your site lives in two places automatically:

1. **GitHub** — full source history
2. **Render** — last successful deploy

If Render ever has an outage or you want to migrate, you can deploy to **Cloudflare Pages**, **Netlify**, or **Vercel** in minutes — they all support the same workflow (GitHub → static site, no build).

---

## Going live checklist

- [ ] Custom domain configured + SSL active
- [ ] Favicon added (drop a `favicon.ico` in the root)
- [ ] OG image for link previews (`og-image.png`, 1200×630)
- [ ] Meta tags for Twitter / OG (description already set; add image tag)
- [ ] Plausible or PostHog analytics installed
- [ ] Stripe Checkout pages connected (when ready to take payments)
- [ ] Privacy policy + terms pages added (Termly.io generates these for free)
- [ ] Test on mobile (real device, not just dev tools)
- [ ] Test the form with edge-case inputs (emoji names, long text, etc.)

You're live.
