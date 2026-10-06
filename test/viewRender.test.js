const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const ejs = require('ejs');

// Render the views the live routes render, with realistic data.
//
// The database-backed views (teddies, marketplace, challenges, battle) were
// never rendered by any test, because their routes need MongoDB. So a template
// error, or an unescaped value, would only have shown up for a real user.
//
// These render with fixtures directly, which also lets a hostile teddy name go
// through the real templates.

const VIEWS = path.join(__dirname, '..', 'views');
const render = (view, locals = {}) =>
  ejs.renderFile(path.join(VIEWS, view), { currentUser: null, ...locals });

const HOSTILE = '<img src=x onerror=alert(1)>';

const teddy = (overrides = {}) => ({
  _id: 't1',
  name: 'Count Cuddula',
  description: 'Bites back.',
  attackDamage: 20,
  health: 100,
  specialMove: 'Vampiric Embrace',
  rarity: 'Rare',
  ...overrides
});

function assertWellFormed(html, label) {
  assert.equal(typeof html, 'string', `${label} should render to a string`);
  assert.ok(html.includes('<html'), `${label} should be a full document`);
  // A stray tag delimiter means a comment or scriptlet ended early.
  assert.ok(!html.includes('<%') && !html.includes('%>'), `${label} leaked template syntax into the page`);
}

test('teddies: renders cards and escapes a hostile name', async () => {
  const html = await render('teddies.ejs', {
    teddies: [teddy({ _id: 't1', name: HOSTILE }), teddy({ _id: 't2', name: 'Grumpy Gus' })],
    art: {}
  });

  assertWellFormed(html, 'teddies.ejs');
  assert.ok(!html.includes('<img src=x onerror'), 'the hostile name must not become a live tag');
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'), 'the name should appear escaped');
  assert.ok(html.includes('Grumpy Gus'));
});

test('teddies: escapes quotes in attributes too', async () => {
  const html = await render('teddies.ejs', {
    teddies: [teddy({ name: '"><script>alert(1)</script>' })],
    art: {}
  });

  assert.ok(!html.includes('<script>alert(1)</script>'), 'must not break out of the alt/aria-label attribute');
});

test('teddies: shows artwork when there is some, a placeholder when there is not', async () => {
  const html = await render('teddies.ejs', {
    teddies: [teddy({ _id: 'with', name: 'Dapper Dan' }), teddy({ _id: 'without', name: 'Grumpy Gus' })],
    art: {
      with: { imageUrl: '/assets/images/dapper_dan.jpg', initials: 'DD' },
      without: { imageUrl: null, initials: 'GG' }
    }
  });

  assert.ok(html.includes('src="/assets/images/dapper_dan.jpg"'), 'artwork should be used when resolved');
  assert.ok(/class="teddy-img-placeholder[^"]*"[^>]*>GG</.test(html), 'a placeholder with initials should be drawn');
  assert.ok(!html.includes('/assets/images/with.jpg'), 'must not request artwork by _id');
  assert.ok(!html.includes('/assets/images/without.jpg'), 'must not request artwork by _id');
});

test('teddies: renders without an art map', async () => {
  const html = await render('teddies.ejs', { teddies: [teddy()] });
  assertWellFormed(html, 'teddies.ejs');
  assert.ok(html.includes('teddy-img-placeholder'));
});

test('marketplace: skips a listing whose teddy was deleted, escapes names', async () => {
  const html = await render('marketplace.ejs', {
    items: [
      { _id: 'gone', price: 5, teddy: null },
      { _id: 'live', price: 7, teddy: { _id: 't2', name: 'Tipsy <b>Toby</b>' } }
    ],
    art: {}
  });

  assertWellFormed(html, 'marketplace.ejs');
  assert.ok(html.includes('Tipsy &lt;b&gt;Toby&lt;/b&gt;'), 'name should be escaped');
  assert.ok(!html.includes('<b>Toby'), 'name must not become markup');
  assert.ok(html.includes('action="/market/buy/live"'), 'live listing gets a Buy form');
  assert.ok(!html.includes('/market/buy/gone'), 'orphaned listing is skipped');
});

test('marketplace: empty state', async () => {
  const html = await render('marketplace.ejs', { items: [], art: {} });
  assert.ok(html.includes('No items available'));
});

test('challenges: renders and escapes', async () => {
  const html = await render('challenges.ejs', {
    challenges: [
      { _id: 'c1', title: HOSTILE, description: 'Win.', type: 'battle', difficulty: 'Hard', reward: 50 }
    ]
  });

  assertWellFormed(html, 'challenges.ejs');
  assert.ok(!html.includes('<img src=x onerror'));
  assert.ok(html.includes('data-challenge-id="c1"'));
});

test('battle: active and finished states', async () => {
  const fighter = (name) => ({ name, health: 40, maxHealth: 100, specialMove: 'Siren\'s Call' });
  const base = { turn: 3, log: ['a', 'b'], winner: null };

  const active = await render('battle.ejs', {
    battleState: { ...base, status: 'active', player: fighter(HOSTILE), opponent: fighter('Grumpy Gus') }
  });
  assertWellFormed(active, 'battle.ejs (active)');
  assert.ok(!active.includes('<img src=x onerror'), 'fighter name must be escaped');
  assert.ok(active.includes('action="/game/execute-turn"'));

  const won = await render('battle.ejs', {
    battleState: { ...base, status: 'finished', winner: 'player', player: fighter('A'), opponent: fighter('B') }
  });
  assert.ok(won.includes('Victory'));
  assert.ok(!won.includes('action="/game/execute-turn"'), 'a finished battle offers no more moves');

  const lost = await render('battle.ejs', {
    battleState: { ...base, status: 'finished', winner: 'opponent', player: fighter('A'), opponent: fighter('B') }
  });
  assert.ok(lost.includes('Defeat'));

  const none = await render('battle.ejs', { battleState: null });
  assert.ok(none.includes('No battle in progress'));
});

test('arena debug view: tolerates a boss with no arena', async () => {
  const html = await render('arenaGUI.ejs', {
    arenas: [{ name: 'The Fluff Pit', difficulty: 3, environment: 'Pit' }],
    bosses: [
      { name: 'Orphan Boss', health: 10, attackDamage: 2, specialMove: 'Sulk', arena: null },
      { name: 'Housed Boss', health: 10, attackDamage: 2, specialMove: 'Loom', arena: { name: 'The Fluff Pit' } }
    ]
  });

  assertWellFormed(html, 'arenaGUI.ejs');
  assert.ok(html.includes('Unassigned'));
  assert.ok(html.includes('Housed Boss'));
});

test('the unwired views still render', async () => {
  // Present but not routed yet (see README). They must at least compile and
  // render, so wiring one up later is not also a debugging session.
  const cases = [
    ['endGame.ejs', {}],
    ['createTeam.ejs', { players: [{ _id: 'p1', username: HOSTILE }] }],
    ['manageTeam.ejs', { team: { _id: 'tm1', members: [{ _id: 'p1', username: HOSTILE }] } }],
    ['teddiesCustomization.ejs', { teddies: [teddy()], skins: [{ _id: 's1', name: 'Red' }], accessories: [{ _id: 'a1', name: 'Hat' }] }]
  ];

  for (const [view, locals] of cases) {
    const html = await render(view, locals);
    assertWellFormed(html, view);
    assert.ok(!html.includes('<img src=x onerror'), `${view} must escape the hostile value`);
  }
});

test('navigation: signed out offers /auth/login and /auth/register, never the 404 paths', async () => {
  for (const partial of ['partials/_nav.ejs', 'partials/_header.ejs']) {
    const html = await render(partial, { currentUser: null });

    assert.ok(html.includes('href="/auth/login"'), `${partial} should link to /auth/login`);
    assert.ok(!html.includes('href="/login"'), `${partial} must not link to /login (404)`);
    assert.ok(!html.includes('href="/register"'), `${partial} must not link to /register (404)`);
    assert.ok(!html.includes('href="/logout"'), `${partial} must not link to /logout (404)`);
    assert.ok(!html.includes('href="/auth/logout"'), `${partial} should not offer Logout when signed out`);
  }

  const app = await render('partials/_nav.ejs', { currentUser: null });
  assert.ok(app.includes('href="/auth/register"'));
});

test('navigation: signed in offers Logout instead of Login', async () => {
  for (const partial of ['partials/_nav.ejs', 'partials/_header.ejs']) {
    const html = await render(partial, { currentUser: { id: 'u1', username: 'ada' } });

    assert.ok(html.includes('href="/auth/logout"'), `${partial} should offer Logout`);
    assert.ok(!html.includes('href="/auth/login"'), `${partial} should not offer Login when signed in`);
  }
});

test('navigation: uses Bootstrap 5 attributes, which is what the site loads', async () => {
  const html = await render('partials/_nav.ejs');

  assert.ok(html.includes('data-bs-toggle="collapse"'));
  assert.ok(html.includes('data-bs-target="#navbarNav"'));
  assert.ok(!html.includes('data-toggle='), 'Bootstrap 4 attribute: the menu would never open');
  assert.ok(!html.includes('sr-only'), 'Bootstrap 4 class');
});
