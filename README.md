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
- CI on every push: tests across Node 18.18/20/22 plus a demo-mode boot check
- Session auth with helmet, rate limiting on the credential routes, and secure
  cookies on by default in production
- Optional `FOUNDER_PACK_URL` monetisation link on the playable demo page

## Requirements

- Node.js 18.18 or newer
- MongoDB is optional for the playable demo
- MongoDB is required for the full persistent account/collection experience

## Security notes

Read this before deploying.

- **Never commit `.env`.** An earlier revision of this repo did, exposing live
  MongoDB Atlas credentials and the session signing key. Both are still present
  in git history, so treat any credential used before July 2026 as compromised
  and rotate it.
- **`SESSION_SECRET` must be long, random, and unique per environment.** Anyone
  who has it can forge session cookies and authenticate as any user. Generate
  one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- **Do not set `NODE_TLS_REJECT_UNAUTHORIZED=0`.** It disables TLS certificate
  verification for the entire process, including the database connection.
- Secure cookies are enabled automatically when `NODE_ENV=production`. Only set
  `FORCE_SECURE_COOKIES=false` if your host genuinely does not terminate HTTPS.

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

## Migrations

`Player` documents gained a `user` reference linking a game profile to a login
account. New registrations create the link automatically; existing rows need a
one-off backfill.

```bash
node scripts/linkPlayersToUsers.js --dry-run   # report only, no writes
node scripts/linkPlayersToUsers.js             # apply
```

It is safe to re-run, skips already-linked profiles, and reports any user
accounts that have no `Player` at all. Until it runs, lookups fall back to
matching on username, so nothing breaks in the meantime.

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
