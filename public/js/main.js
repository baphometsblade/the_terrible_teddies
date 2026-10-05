// Loads per-teddy artwork, sound and animation when a teddy is selected.
//
// Rewritten without jQuery: this used $(document).ready and $.ajax-style
// helpers, but no view on the site loads jQuery, so it threw "$ is not
// defined" the moment it ran.
//
// KNOWN GAP, deliberately not guessed at: the asset URLs are built from the
// teddy's _id, e.g. /assets/animations/<id>.css - but the files shipped in
// public/assets are named after the teddy, e.g. "Count Cuddula.css". So a
// lookup by id can never match, and public/assets/images does not exist at
// all. Whoever owns the asset pipeline needs to decide which side changes;
// until then every lookup here fails quietly rather than breaking the page.

document.addEventListener('DOMContentLoaded', () => {
  const loadedStylesheets = new Set();

  const applyAnimationStylesheet = (teddyId) => {
    const id = `css-${teddyId}`;
    if (loadedStylesheets.has(id) || document.getElementById(id)) return;

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `/assets/animations/${encodeURIComponent(teddyId)}.css`;
    // A missing stylesheet is expected (see the gap above); don't let it shout.
    link.addEventListener('error', () => {
      console.debug(`No animation stylesheet for teddy ${teddyId}`);
    });

    document.head.appendChild(link);
    loadedStylesheets.add(id);
  };

  const playVoiceLine = (teddyId) => {
    const audio = new Audio(`/assets/sounds/${encodeURIComponent(teddyId)}.wav`);
    audio.play().catch((error) => {
      // Autoplay restrictions and missing files both land here.
      console.debug(`Could not play sound for teddy ${teddyId}: ${error.message}`);
    });
  };

  const swapImage = (teddyId) => {
    const img = document.getElementById(`img-${teddyId}`);
    if (!img) return;
    img.src = `/assets/images/${encodeURIComponent(teddyId)}.jpg`;
    // imageFallback.js substitutes a placeholder if this 404s.
  };

  // Delegated so it works for cards rendered after load.
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.select-teddy');
    if (!button) return;

    const teddyId = button.dataset.teddyId;
    if (!teddyId) return;

    swapImage(teddyId);
    playVoiceLine(teddyId);
    applyAnimationStylesheet(teddyId);

    const img = document.getElementById(`img-${teddyId}`);
    if (img) {
      img.classList.add(`${teddyId.replace(/ /g, '-')}-animation`);
    }
  });
});
