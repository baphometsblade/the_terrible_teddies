# Terrible Teddies

Terrible Teddies is a strategic teddy bear card battler where players collect ridiculous fighters, choose moves, and battle through a turn-based fluff pit.

The repository now includes a guaranteed playable web demo that can run without MongoDB, plus the existing Express/MongoDB foundation for accounts, teams, marketplace, challenges, events, and persistent collections.

## What runs today

- Express server with EJS views
- `/play` browser demo with selectable teddies
- Deterministic battle engine in `services/battleEngine.js`
- Demo teddy deck in `data/demoTeddies.js`
- `/api/demo/teddies` JSON endpoint
- `/api/demo/battle` automated battle endpoint
- `/health` deployment health check
- Node test suite using `node --test`
- Optional `FOUNDER_PACK_URL` monetisation link on the playable demo page

## Requirements

- Node.js 18.18 or newer
- MongoDB is optional for the playable demo
- MongoDB is required for the full persistent account/collection experience

## Fastest local run

```bash
npm install
cp .env.example .env
npm run dev
```

Open:

```text
http://localhost:3000/play
```

This starts the game in demo mode and skips MongoDB.

## Full production run

Set these environment variables in your host:

```bash
PORT=3000
NODE_ENV=production
SESSION_SECRET=use-a-long-random-secret
DATABASE_URL=mongodb+srv://...
DEMO_MODE=false
FOUNDER_PACK_URL=https://your-payment-or-store-link.example
```

Then run:

```bash
npm install
npm start
```

## Monetisation path

Use `FOUNDER_PACK_URL` for the fastest revenue setup. It can point to Stripe Payment Links, Gumroad, Ko-fi, Patreon, Fourthwall, Shopify, or any other checkout page.

Recommended first offer:

- Founder Pack: early supporter credit, exclusive teddy skin, Discord role, and first-season cosmetic drop
- Price test: AUD $9, $19, and $29 tiers
- CTA: place the `/play` link in YouTube descriptions, pinned comments, Shorts captions, and livestream chat

## Test

```bash
npm test
```

The battle engine tests verify battle creation, damage calculation, turn execution, and auto battle completion.

## Key routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/play` | Playable demo |
| `/health` | Deployment health check |
| `/api/demo/teddies` | Demo teddy deck JSON |
| `/api/demo/battle` | Automated demo battle JSON |
| `/teddies` | Authenticated collection route |

## Deployment notes

For the fastest public demo, deploy with `DEMO_MODE=true` and no `DATABASE_URL`. Add MongoDB later when you want persistent user accounts, inventory, marketplace listings, and progression.

## License

Copyright (c) 2024-2026.
