const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createTeddyAssets, imageSlug, initialsFor, sameOriginPath } = require('../services/teddyAssets');

// Artwork is looked up by teddy name, not _id.
//
// views/teddies.ejs requested /assets/images/<_id>.jpg. An _id is generated at
// insert time, so no committed file can ever match it, and every card fired a
// request that could only 404. The generators in scripts/ all key on the name.

function imagesDir(files = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-art-'));
  for (const file of files) fs.writeFileSync(path.join(dir, file), '');
  return dir;
}

test('imageSlug follows the image generator naming rule', () => {
  // scripts/generateImages.py strips all but letters, digits and spaces; the
  // python side then swaps spaces for underscores and lowercases.
  assert.equal(imageSlug('Count Cuddula'), 'count_cuddula');
  assert.equal(imageSlug("Beauty's Beast"), 'beautys_beast');
  assert.equal(imageSlug('Hansel and Gretel'), 'hansel_and_gretel');
  assert.equal(imageSlug('Chef CuddleCuisine'), 'chef_cuddlecuisine');
  assert.equal(imageSlug(null), '');
});

test('imageUrlFor finds artwork by teddy name, whatever the extension case', () => {
  const assets = createTeddyAssets({ imagesDir: imagesDir(['count_cuddula.PNG', 'dapper_dan.jpg']) });

  assert.equal(assets.imageUrlFor({ name: 'Count Cuddula' }), '/assets/images/count_cuddula.PNG');
  assert.equal(assets.imageUrlFor({ name: 'Dapper Dan' }), '/assets/images/dapper_dan.jpg');
});

test('imageUrlFor returns null when there is no artwork, so the page draws a placeholder', () => {
  const assets = createTeddyAssets({ imagesDir: imagesDir(['dapper_dan.jpg']) });

  assert.equal(assets.imageUrlFor({ name: 'Grumpy Gus' }), null);
  assert.equal(assets.imageUrlFor({ name: 'Grumpy Gus', imageUrl: '' }), null);
  assert.equal(assets.imageUrlFor(null), null);
});

test('imageUrlFor does not throw when the images directory does not exist', () => {
  const assets = createTeddyAssets({ imagesDir: path.join(os.tmpdir(), 'tt-no-such-dir-xyz') });
  assert.equal(assets.imageUrlFor({ name: 'Grumpy Gus' }), null);
});

test('a file beats the stored imageUrl; the stored imageUrl is the fallback', () => {
  const assets = createTeddyAssets({ imagesDir: imagesDir(['dapper_dan.jpg']) });

  assert.equal(
    assets.imageUrlFor({ name: 'Dapper Dan', imageUrl: '/assets/other.png' }),
    '/assets/images/dapper_dan.jpg'
  );
  assert.equal(assets.imageUrlFor({ name: 'Grumpy Gus', imageUrl: '/assets/gus.png' }), '/assets/gus.png');
});

test('only same-origin paths are accepted from the database', () => {
  // The CSP is img-src 'self' data:, so a remote URL would be blocked anyway;
  // refusing it up front means a placeholder rather than a console error.
  assert.equal(sameOriginPath('/assets/gus.png'), '/assets/gus.png');
  assert.equal(sameOriginPath('  /assets/gus.png  '), '/assets/gus.png');

  for (const rejected of [
    'https://evil.example/x.png',
    'http://evil.example/x.png',
    '//evil.example/x.png',
    'javascript:alert(1)',
    'data:image/svg+xml;base64,AAAA',
    'assets/relative.png',
    '/assets/../../etc/passwd',
    '/assets\\..\\secret',
    '',
    null,
    undefined,
    42
  ]) {
    assert.equal(sameOriginPath(rejected), null, `should reject ${JSON.stringify(rejected)}`);
  }
});

test('the directory listing is cached for the TTL, then refreshed', () => {
  const dir = imagesDir();
  let clock = 1000;
  const assets = createTeddyAssets({ imagesDir: dir, ttlMs: 30000, now: () => clock });

  assert.equal(assets.imageUrlFor({ name: 'Grumpy Gus' }), null);

  fs.writeFileSync(path.join(dir, 'grumpy_gus.png'), '');
  clock += 29000;
  assert.equal(assets.imageUrlFor({ name: 'Grumpy Gus' }), null, 'still cached inside the TTL');

  clock += 2000;
  assert.equal(assets.imageUrlFor({ name: 'Grumpy Gus' }), '/assets/images/grumpy_gus.png');
});

test('artFor keys artwork by string id and includes placeholder initials', () => {
  const assets = createTeddyAssets({ imagesDir: imagesDir(['dapper_dan.jpg']) });
  const art = assets.artFor([
    { _id: { toString: () => 'a1' }, name: 'Dapper Dan' },
    { _id: 'b2', name: 'Grumpy Gus' }
  ]);

  assert.deepEqual(art, {
    a1: { imageUrl: '/assets/images/dapper_dan.jpg', initials: 'DD' },
    b2: { imageUrl: null, initials: 'GG' }
  });
});

test('initialsFor', () => {
  assert.equal(initialsFor('Count Cuddula'), 'CC');
  assert.equal(initialsFor('Alice in Wonderlust'), 'AIW');
  assert.equal(initialsFor('A B C D'), 'ABC');
  assert.equal(initialsFor(''), '?');
  assert.equal(initialsFor(undefined), '?');
});
