// Graceful fallback for teddy artwork that fails to load.
//
// views/teddies.ejs previously did this with an inline attribute:
//   onerror="this.onerror=null;this.src='/images/default.jpg';"
//
// Two problems. First, the Content-Security-Policy (script-src with no
// unsafe-inline) blocks inline event handlers, so it never ran. Second,
// /images/default.jpg does not exist in this repo, so the fallback was itself
// a 404 - as is /assets/images/, which is where the originals are expected.
//
// Instead of pointing at a missing file, a failed image is replaced by a
// CSS-drawn placeholder showing the teddy's initials, so nothing 404s.

document.addEventListener('DOMContentLoaded', () => {
  const initialsFor = (text) =>
    (text || '?')
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .join('')
      .slice(0, 3)
      .toUpperCase();

  const replaceWithPlaceholder = (img) => {
    if (img.dataset.fallbackApplied === 'true') return;
    img.dataset.fallbackApplied = 'true';

    const placeholder = document.createElement('div');
    placeholder.className = 'teddy-img-placeholder card-img-top';
    // textContent, never innerHTML - alt text comes from the teddy name.
    placeholder.textContent = initialsFor(img.getAttribute('alt'));
    placeholder.setAttribute('role', 'img');
    placeholder.setAttribute('aria-label', img.getAttribute('alt') || 'Teddy artwork unavailable');

    img.replaceWith(placeholder);
  };

  document.querySelectorAll('img.card-img-top').forEach((img) => {
    img.addEventListener('error', () => replaceWithPlaceholder(img));
    // An image that already failed before this script ran fires no event.
    if (img.complete && img.naturalWidth === 0) {
      replaceWithPlaceholder(img);
    }
  });
});
