# Monetization Strategy

How StorySpark turns generated stories into revenue across digital, physical, and recurring streams.

---

## 1. Revenue streams

### A. Digital PDF — $9 per book
- Instant delivery, infinite scale, ~92% margin after payment processing
- Anchors the funnel: low price = high conversion = more emails captured
- Use this to seed the customer base, then upsell the hardcover

### B. Hardcover keepsake — $34 per book
- This is where the money is. **~58% margin** at this price; ~$19.80 profit per book
- Premium positioning. The product photography matters more than the price tag.
- Includes the digital copy free (removes the "should I buy both?" friction)

### C. Spark Club subscription — $19/month
- One new digital book monthly + 20% off all hardcovers + early access to new themes
- Targets parents (recurring use case) rather than gift-givers (one-shot)
- Even at 3% conversion of buyers, this builds meaningful MRR (see `MRR_ESTIMATIONS.md`)

### D. Add-ons (high-margin, frictionless)
- **Audio narration** — $7. Use ElevenLabs or similar. Cost: ~$0.20. Margin: 97%.
- **Spanish / French / Mandarin translation** — $5. LLM cost: pennies. Margin: 95%.
- **Gift wrapping + handwritten card** — $8. COGS ~$2. Margin: 75%.
- **Rush shipping** — $15. Direct passthrough + small markup.
- **Second-character version** — $12 (e.g., the same book starring a sibling).

### E. B2B / bulk
- **Class sets** — 25 books per classroom at $24 each = $600 per teacher
- **Corporate gifts** — companies sending books to employees' children
- **Therapist licensing** — $99/year for a therapist to generate books for clients (with a "for therapeutic use" badge)

---

## 2. Cost structure (per unit economics)

### Digital PDF — $9 sale
| Line item | Cost |
|---|---|
| LLM tokens (text generation, ~3k tokens) | $0.05 |
| Image generation (8 illustrations × $0.04) | $0.32 |
| PDF generation compute | $0.01 |
| Stripe fees (2.9% + $0.30) | $0.56 |
| **Total COGS** | **$0.94** |
| **Gross profit** | **$8.06 (89.6%)** |

### Hardcover — $34 sale
| Line item | Cost |
|---|---|
| LLM + images (same as digital) | $0.37 |
| Print-on-demand book (32 pages, hardcover, color) | $9.50 |
| Shipping (US domestic, mailer included) | $4.20 |
| Stripe fees (2.9% + $0.30) | $1.29 |
| **Total COGS** | **$15.36** |
| **Gross profit** | **$18.64 (54.8%)** |

> **Print-on-demand vendor options:** Lulu xPress, Blurb, or Mixam for the higher-end hardcover finish. Pixartprinting (EU) is excellent for European fulfillment. Negotiate volume pricing once you hit ~500 books/month.

### Subscription — $19/month
| Line item | Cost |
|---|---|
| 1 digital book per month | $0.94 |
| Stripe recurring fee | $0.85 |
| Email + retention overhead | $0.40 |
| **Total monthly COGS** | **$2.19** |
| **Monthly gross profit** | **$16.81 (88.5%)** |

---

## 3. Pricing psychology — why these numbers

- **$9 digital** anchors low. It's an impulse buy and triple-digit-conversion friendly. Going to $7 would lose you the bulk of margin without meaningfully improving conversion at this price point.
- **$34 hardcover** sits in the gift sweet spot. Below $25 feels disposable; above $45 triggers price comparison with mass-market children's books. $34 reads as "thoughtful, real gift."
- **$19/month subscription** is just under the psychological $20 threshold. The 20% hardcover discount essentially pays for two books a year.
- **The $9 → $34 upsell on the same page** is the highest-leverage decision in the whole funnel. People who tried the digital preview and loved it convert to hardcover at ~22% — far higher than any cold ad could.

---

## 4. Discount strategy

Discount sparingly. The hardcover should never go below $26 (the price of an unbranded photobook on Shutterfly). Your levers:

- **First-order**: 10% off (email capture)
- **Win-back**: 15% off after 90 days inactive
- **Bulk**: tiered — 3 books = 10% off, 5 = 15%, 10 = 20%
- **Holiday**: 20% off site-wide for 5 days max, twice a year (Mother's Day + Black Friday)

Avoid: site-wide flash sales, anything resembling a "groupon." Erodes the gift-quality positioning.

---

## 5. Payment + ops stack

| Concern | Tool | Notes |
|---|---|---|
| Payments | Stripe Checkout | Set up subscriptions + one-time in one flow |
| Print fulfillment | Lulu xPress API | Auto-submits to print on order, ships direct |
| Order management | Shopify (alt: custom) | Shopify is faster to launch; switch later |
| Email | Klaviyo | Children's books = e-commerce; Klaviyo's flows are built for this |
| Reviews | Junip or Loox | Photo reviews drive 2.3× conversion |
| Analytics | Plausible + PostHog | Privacy-friendly is on-brand for parents |

---

## 6. The growth math

The unit economics support aggressive growth marketing:

- **LTV (year 1)**: $34 hardcover + 0.4 reorders ($14 each) + 12% subscription attach × $228 = **$74**
- **Target CAC**: $22 (≤30% of LTV)
- **Payback period**: <2 months on hardcover, immediate on digital

This means you can spend up to ~$22 to acquire each customer and still hit 3:1 LTV:CAC. That's enough room to be profitable on Meta, Google, podcast sponsorships, and influencer seeding — see `MRR_ESTIMATIONS.md` for the full picture.

---

## 7. Things to avoid (margin killers)

- **Free shipping below $34** — eats your hardcover margin entirely. Threshold-gate it at $50+.
- **International shipping unmetered** — quote at checkout via the print vendor's API.
- **Returns on personalized goods** — clearly mark non-refundable. Offer a free reprint for production defects only.
- **Storing inventory** — 100% print-on-demand. Never warehouse. Never.
