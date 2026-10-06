# Terrible Teddies

Terrible Teddies is a strategic teddy bear card battler where players collect ridiculous fighters, choose moves, and battle through a turn-based fluff pit.

The repository now includes a guaranteed playable web demo that can run without MongoDB, plus the existing Express/MongoDB foundation for accounts, teams, marketplace, challenges, events, and persistent collections.

## What runs today

- Express server with EJS views
- `/play` browser demo with selectable teddies
- Seeded battle engine in `services/battleEngine.js` — damage variance,
  critical hits, and reactive opponent AI, all reproducible from a seed
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

- **Never commit `.env`, and never hardcode a connection string.** Earlier
  revisions did both, exposing live MongoDB Atlas credentials and the session
  signing key. This repository is public and everything committed stays in git
  history, so treat every database credential that was ever used with it as
  compromised and rotate it - deleting the file does not undo the exposure.
  `test/noSecrets.test.js` fails the build if a connection string containing a
  username and password is committed.
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

## Battle randomness

Battles are random but reproducible. Each battle carries a `seed` and an
`rngStep`, so `executeTurn(state, move)` is a pure function: the same state and
move always give the same outcome.

That matters because battle state lives in the session between requests. With a
bare `Math.random()`, a retried or replayed POST would produce a different
result — and a player could re-roll a bad turn just by resubmitting the form.

Pass a seed to replay a battle exactly:

```js
const { createBattle, autoBattle } = require('./services/battleEngine');

createBattle(playerTeddy, opponentTeddy, { seed: 12345 }); // same fight every time
autoBattle(playerTeddy, opponentTeddy, undefined, { seed: 42 });
```

Omit the seed and one is chosen at random.

## Fastest local run

```bash
npm install
cp .env.example .env
npm run dev
```

`npm run dev` pins `NODE_ENV=development` deliberately. If `NODE_ENV` is
`production` — which can be inherited from a parent process, not just set on
purpose — session cookies become `Secure` and are never issued over plain-HTTP
localhost, so the demo silently cannot keep a battle between requests.

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

## Seed and repair scripts

**These now require explicit confirmation.** They previously connected to
whatever `DATABASE_URL` pointed at and started writing the moment they were
invoked — and `.env` points at the live cluster, so a stray `node fixDatabase.js`
rewrote production records with no prompt and no way to preview.

```bash
node fixDatabase.js --dry-run   # show exactly what would change
node fixDatabase.js --yes       # apply
```

Running with no flags prints the target database (credentials masked) and exits
without writing. The same applies to `populateDatabase.js`, `populateItems.js`,
`scripts/seedChallenges.js`, `scripts/seedEventsAndBosses.js` and
`scripts/populateCustomItems.js`. `CONFIRM_WRITE=1` works in place of `--yes`
for non-interactive use.

Note on `fixDatabase.js`: it overwrites `health` and `attackDamage` on the
teddies it lists, which undoes any level-up progression those teddies earned.
Its `--dry-run` prints a field-by-field diff so you can see that before it
happens.

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

## Teddy artwork

Artwork is looked up by teddy **name**, never by database id: an `_id` is
generated at insert time, so no committed file could ever match one.

Put `public/assets/images/<name>.png` (or `.jpg`, `.jpeg`, `.webp`) in place,
where `<name>` is the teddy's name with everything but letters, digits and
spaces removed, spaces turned into underscores, and lowercased - the same rule
`scripts/generateImages.py` uses. `Count Cuddula` becomes `count_cuddula.png`
and `Beauty's Beast` becomes `beautys_beast.png`.

A teddy with no file falls back to its `imageUrl` if that is a same-origin path,
and otherwise to a placeholder tile showing its initials, so the server never
emits a request that is certain to 404. The directory listing is cached for 30
seconds. Remote image URLs are not accepted: the Content Security Policy allows
only `'self'` and `data:`, so add the host to `imgSrc` in `server.js` first.

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

Beyond unit tests there are structural guards, which catch whole classes of
defect rather than single bugs:

- `authCoverage` boots the app, enumerates every route and calls each one with
  no session. Anything not listed as public in the test must answer 401 or 403.
- `linkTargets` and `formActions`: every hard-coded link and form action in a
  view must lead to a real route.
- `viewCompile` and `viewRender`: every view compiles, emits nothing unescaped,
  and renders with realistic data, including a hostile teddy name.
- `viewAssets`: every script a view loads exists, and nothing the Content
  Security Policy would block (inline script or style, unlisted CDN hosts).
- `dbGuard`: database routes answer 503 at once, not after a ten second hang,
  when there is no database.
- `noSecrets`: no credentialed connection string in any tracked file.

Each has a control case, so it cannot pass just because it never sees a failure.

## Key routes

Public (no login):

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/play`, `/play/start`, `/play/turn` | Playable demo (no database needed) |
| `/api/demo/teddies`, `/api/demo/battle` | Demo deck and automated battle JSON |
| `/health` | Deployment health check |
| `/auth/register`, `/auth/login`, `/auth/logout` | Account entry points |
| `/market` | Browse marketplace listings |
| `/challenges`, `/challenges/active` | Browse active challenges |
| `/api/events` | Active events JSON |

Login required:

| Route | Purpose |
| --- | --- |
| `/teddies` | Your collection |
| `/game/choose-lineup`, `/game/initiate-battle`, `/game/battle`, `/game/execute-turn` | The battle loop |
| `/game/end-game`, `/game/initiate-end-game-battle` | End-game arenas and bosses |
| `/game/arena-gui` | Debug view of the seeded arenas and bosses |
| `/api/teddies/customize` | Attach a skin or accessory to a teddy |
| `/market/sell`, `/market/buy/:itemId` | List and buy teddies |
| `/challenges/complete` | Complete a challenge |
| `/teams/create`, `/teams/:teamId/addMember` | Teams |
| `/api/boss-fight` | Boss fight attack check |

Every route outside the first table must refuse an anonymous caller, and
`test/authCoverage.test.js` enforces it. To add a public route, list it there
as well, which keeps the decision explicit and reviewable.

## Present but not wired up

Four views exist, compile and render (`test/viewRender.test.js` checks), but no
route renders them. Wiring each one is a product decision rather than a bug fix:

- `createTeam` and `manageTeam`: the team routes only return JSON, nothing lists
  the players to pick from, and the manage form asks the user to paste a raw
  database id.
- `teddiesCustomization`: the customise endpoint works, but registration gives
  nobody any teddies, so every teddy is unowned and any player could change a
  shared one.
- `endGame`: needs a page route; `/game/end-game` already returns JSON.

Also unused: `public/assets/animations/*.css` and `public/assets/sounds/*.wav`.
Most of the animation files are invalid CSS - `scripts/generateAnimations.js`
writes teddy names containing spaces or apostrophes straight into a class and a
keyframe name - and the sounds are one-second placeholder tones named after each
teddy's special move. Nothing loads either.

A live "latest teddy stats" panel and a select-a-teddy effect script were
removed because they could never run: the panel's container element and its
endpoint never existed, and the effect script was only loaded by views that no
route renders.
## Deployment notes

For the fastest public demo, deploy with `DEMO_MODE=true` and no `DATABASE_URL`. Add MongoDB later when you want persistent user accounts, inventory, marketplace listings, and progression.

## License

Copyright (c) 2024-2026.
