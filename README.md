# StorySpark — Custom Children's Books

Generate beautifully illustrated, personalized children's books in seconds. Pick a hero, theme, and a happy ending — StorySpark crafts a one-of-a-kind picture book for the little reader in your life.

![StorySpark hero](https://img.shields.io/badge/status-MVP-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![Built with](https://img.shields.io/badge/built%20with-vanilla%20JS-orange)

## What's inside

- `index.html` — full marketing site + book generator UI
- `styles.css` — storybook aesthetic (warm cream + sunset coral + sky teal)
- `app.js` — template-driven story engine with SVG illustration generator
- `docs/` — marketing playbook, monetization plan, MRR estimations, deployment guide

## Local preview

This is a static site — no build step required.

```bash
# any of these work
python3 -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000`.

## Deploying

1. Push this repo to GitHub.
2. Connect to [Render](https://render.com) as a **Static Site**.
3. Build command: *(leave empty)*
4. Publish directory: `.`

Full step-by-step in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Documentation

| Doc | What it covers |
|---|---|
| [`docs/MARKETING.md`](docs/MARKETING.md) | Channels, content, partnerships, ad strategy |
| [`docs/MONETIZATION.md`](docs/MONETIZATION.md) | Pricing, COGS, fulfillment, upsells |
| [`docs/MRR_ESTIMATIONS.md`](docs/MRR_ESTIMATIONS.md) | Conservative / base / aggressive scenarios with math |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | GitHub + Render walkthrough |
| [`docs/PRODUCT_ROADMAP.md`](docs/PRODUCT_ROADMAP.md) | What to build next (real AI text + illustration) |

## Tech notes

The current generator is **template-driven** so the demo runs entirely client-side with zero API costs. To ship to real customers, you'll want to swap the templates for an LLM call (see `docs/PRODUCT_ROADMAP.md`). The form, preview, and overall UX stay identical — only the `buildStory()` function changes.

## License

MIT
