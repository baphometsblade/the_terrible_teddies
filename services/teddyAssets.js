// Resolves artwork for a teddy.
//
// The views used to request /assets/images/<teddy _id>.jpg. That could never
// match. An _id is generated when a teddy is inserted, so a file named after one
// cannot be committed to the repo or reproduced by a seed script - and nothing
// in this repo names files that way. The generators key on the teddy instead:
//
//   scripts/generateImages.py   -> public/assets/images/<name_with_underscores>.png
//   scripts/generateAnimations.js -> public/assets/animations/<name>.css
//   scripts/generateSoundEffects.js -> public/assets/sounds/<specialMove>.wav
//
// So artwork is looked up by name, using the same rule as the image generator.
// A teddy with no artwork gets a placeholder drawn by the server, rather than a
// request that is guaranteed to 404.

const fs = require('fs');
const path = require('path');

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

/**
 * The generator's naming rule: strip everything but letters, digits and spaces,
 * turn each space into "_", lowercase. "Beauty's Beast" -> "beautys_beast".
 */
function imageSlug(name) {
  return String(name || '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/ /g, '_')
    .toLowerCase();
}

/** "Count Cuddula" -> "CC". Used for the placeholder tile. */
function initialsFor(name) {
  const initials = String(name || '')
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .slice(0, 3)
    .toUpperCase();

  return initials || '?';
}

/**
 * Accept a stored imageUrl only if it is a same-origin path.
 *
 * The CSP is img-src 'self' data:, so a remote URL would be blocked anyway and
 * only produce a console error before the placeholder appeared. To serve
 * artwork from a host, add it to imgSrc in server.js and relax this.
 */
function sameOriginPath(value) {
  if (typeof value !== 'string') return null;

  const candidate = value.trim();
  if (!candidate.startsWith('/')) return null; // relative, remote, or javascript:
  if (candidate.startsWith('//')) return null; // protocol-relative: a remote host
  if (candidate.includes('\\') || candidate.includes('..')) return null;

  return candidate;
}

function createTeddyAssets(options = {}) {
  const imagesDir = options.imagesDir || path.join(__dirname, '..', 'public', 'assets', 'images');
  const urlPrefix = options.urlPrefix || '/assets/images';
  const ttlMs = options.ttlMs ?? 30 * 1000;
  const now = options.now || Date.now;

  let cached = null;
  let cachedAt = 0;

  // One directory listing per TTL window rather than a stat per teddy per page.
  function localImages() {
    if (cached && now() - cachedAt < ttlMs) return cached;

    const found = new Map();
    try {
      for (const file of fs.readdirSync(imagesDir)) {
        const { name, ext } = path.parse(file);
        if (IMAGE_EXTENSIONS.has(ext.toLowerCase())) {
          found.set(name.toLowerCase(), file);
        }
      }
    } catch {
      // No images directory yet: nothing to resolve, so every teddy falls back
      // to a placeholder.
    }

    cached = found;
    cachedAt = now();
    return found;
  }

  function imageUrlFor(teddy) {
    if (!teddy) return null;

    const file = localImages().get(imageSlug(teddy.name));
    if (file) return `${urlPrefix}/${encodeURIComponent(file)}`;

    return sameOriginPath(teddy.imageUrl);
  }

  /** { "<teddy id>": { imageUrl, initials } } for a list of teddies. */
  function artFor(teddies) {
    const art = {};
    for (const teddy of teddies) {
      art[String(teddy._id)] = {
        imageUrl: imageUrlFor(teddy),
        initials: initialsFor(teddy.name)
      };
    }
    return art;
  }

  return { imageUrlFor, artFor };
}

module.exports = {
  createTeddyAssets,
  imageSlug,
  initialsFor,
  sameOriginPath,
  ...createTeddyAssets()
};
