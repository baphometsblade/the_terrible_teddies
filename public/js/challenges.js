// Complete-challenge buttons.
//
// This was an inline <script> in views/challenges.ejs that depended on jQuery
// loaded from /js/jquery.min.js - a file that does not exist in this repo. So
// the button was already dead, and the Content-Security-Policy added later
// (script-src 'self', no unsafe-inline) blocked the inline block as well.
//
// Moving it to a file fixes both: it is same-origin, so the CSP allows it, and
// it uses fetch instead of jQuery, so there is no missing dependency.

document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('challenges-list');
  if (!list) return;

  // Delegated, so it survives the list being re-rendered.
  list.addEventListener('click', async (event) => {
    const button = event.target.closest('.complete-challenge');
    if (!button) return;

    const challengeId = button.dataset.challengeId;
    if (!challengeId) return;

    button.disabled = true;
    const originalLabel = button.textContent;
    button.textContent = 'Completing...';

    try {
      const response = await fetch('/challenges/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ challengeId }).toString()
      });

      if (response.ok) {
        window.location.reload();
        return;
      }

      // The route distinguishes these, so say something useful rather than a
      // single generic failure.
      const message = {
        401: 'Please log in to complete challenges.',
        404: 'That challenge is no longer available.',
        409: 'You have already completed this challenge.'
      }[response.status] || 'Failed to complete challenge. Please try again.';

      window.alert(message);
    } catch (error) {
      console.error('Error completing challenge:', error.message);
      window.alert('Failed to complete challenge. Please try again.');
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });
});
