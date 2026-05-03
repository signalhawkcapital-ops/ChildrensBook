# Product Roadmap

The current MVP is a fully functional **template-driven** story generator. It runs entirely client-side, costs nothing per generation, and is good enough to validate demand. To turn it into a real product, here's the path from V1 → V3.

---

## V1 (current) — Template engine

**Status:** Done. What's shipped today.

- Form captures hero name, supporting cast, interests, theme, outcome
- 11 themes + custom, 8 outcomes + custom
- 8-page picture book with cover + optional dedication
- SVG illustrations generated procedurally (consistent character, theme-tinted backgrounds)
- 100% client-side — zero per-generation cost
- "Generate again" button for variety

**Good for:** validating the funnel (visitor → preview → email signup → checkout intent), running early ads, gathering UGC.

**Limit:** every story uses the same template skeleton. After ~10 generations a sharp customer will notice the structure repeats.

---

## V2 — Real LLM-generated text

**Goal:** every story is genuinely unique, with prose quality that earns the $34 hardcover price.

### Implementation

Replace the `buildStory()` function in `app.js` with a call to a backend endpoint that uses an LLM. The frontend stays identical.

**Recommended stack:**
- **Backend**: Node.js or Python on Render (see `DEPLOYMENT.md`)
- **LLM**: Claude Sonnet or Haiku (Haiku for cost, Sonnet for quality — start with Sonnet to set the bar, drop to Haiku once you've fine-tuned the prompt)
- **Cost per book**: ~$0.04–$0.08 in tokens

### Prompt structure

System prompt establishes the constraints: 8 pages, ~30 words per page, age-appropriate vocabulary, character consistency, theme + outcome adherence.

The user message contains the form data as structured JSON. The LLM returns:

```json
{
  "title": "Maya and the Whispering Forest",
  "pages": [
    { "page": 1, "text": "...", "illustration_prompt": "..." },
    ...
  ]
}
```

The `illustration_prompt` field becomes the input to V2's image generation.

### Things to nail in the prompt

- **Reading level matched to age** (the form already collects this)
- **No scary content even when the theme is "overcoming a fear"** — the fear must be small and surmountable
- **Names spelled correctly every time** — pronouns inferred or asked
- **Avoid clichés** — explicitly forbid "once upon a time", "they lived happily ever after", etc.
- **End on the chosen outcome, not a generic one** — this is the most common LLM failure mode

---

## V2.5 — Real illustrations

The current SVG character is charming but limited. V2.5 swaps it for AI-generated images that maintain character consistency across all 8 pages.

### Options (ranked)

1. **Flux Schnell** via Replicate — ~$0.003/image, very fast, decent style control
2. **Flux Dev** via Replicate — ~$0.04/image, much better quality
3. **GPT-image-1** via OpenAI — ~$0.04–$0.19/image, excellent character consistency, the current state-of-the-art for this use case
4. **Recraft v3** — explicit illustration style, very on-brand for kids' books

### Character consistency strategy

The hard part isn't generating a single beautiful image — it's making sure the same character appears across 8 pages. Three approaches:

- **Reference image + Flux/Recraft img2img**: generate the character once as a reference, pass it as a guide for every subsequent page
- **GPT-image-1 multi-turn**: provide the previous page's image as context for the next
- **Pre-generated style sheet**: build a library of 50 base characters, let the user pick at form time, then describe outfits/poses

The third option is cheapest and gives the most predictable output for a children's book product.

---

## V3 — Print fulfillment automation

When orders start flowing, manual fulfillment breaks fast. V3 automates the hardcover pipeline:

1. Customer pays via Stripe → webhook fires
2. Backend generates the print-ready PDF (300dpi, CMYK, bleed margins)
3. PDF + shipping address pushed to Lulu xPress API
4. Order confirmation email with tracking

**Critical**: print preview before fulfillment. Show customers exactly what their hardcover will look like and require them to confirm. This drops your defect rate from ~5% to under 1%.

---

## V4 — Subscription + family profiles

Once Spark Club hits 100+ subscribers, the experience needs to grow up:

- **Family profiles**: store each child's name, age, interests, friends
- **Birthday / milestone triggers**: auto-suggest themes when a child's birthday is approaching
- **Series / recurring characters**: book #2 brings back the same friends from book #1
- **Co-creation mode**: child + parent answer 5 questions together to shape the story

This is what turns a one-off purchase into a 5-year customer.

---

## V5 — Audio + video

The market beyond static books is huge:

- **Audiobook narration** ($7 add-on, $0.20 cost via ElevenLabs)
- **Animated video version** ($19 add-on) — RunwayML or Sora, 90-second animation per book
- **App version** with read-along highlighting — kids learning to read

These are higher-margin add-ons, not separate products. Sell them at checkout.

---

## What NOT to build

- Real-time collaboration / "shared books" — sounds nice, no one asked for it
- A marketplace where parents publish their books for others — IP nightmare, dilutes brand
- A character creator with manual avatar building — kids and parents don't want to design avatars; they want a beautiful book in 60 seconds
- Generic "AI for kids" content beyond books — focus is the moat

---

## Suggested build order

1. ✅ **Now**: ship V1, drive 1,000 visitors, measure preview → checkout intent
2. **Month 2**: V2 (real LLM text) before any paid ads
3. **Month 3**: V2.5 (real illustrations) — this is when you can confidently push paid acquisition
4. **Month 4**: V3 (print automation) once you cross ~100 hardcovers/month
5. **Month 6**: V4 (subscriptions + profiles)
6. **Month 9+**: V5 (audio/video) — only if subscription retention is strong

The goal of every version is to make the product earn its price. Don't add features that don't move conversion or AOV.
