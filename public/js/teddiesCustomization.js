// Apply a skin/accessory to a teddy.
//
// This used jQuery ($.ajax, $(document).ready), but no view on the site loads
// jQuery - so it threw "$ is not defined" the moment it ran and the button
// never worked. Rewritten with fetch, which needs no dependency and satisfies
// the Content-Security-Policy as a same-origin file.

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('.apply-customization');
    if (!button) return;

    const panel = button.closest('.teddy-customization');
    if (!panel) return;

    const teddyId = panel.dataset.teddyId;
    const skinId = panel.querySelector('.skin-selector')?.value || '';
    const accessoryId = panel.querySelector('.accessory-selector')?.value || '';

    if (!teddyId) {
      window.alert('Could not determine which teddy to customise.');
      return;
    }
    // The route requires at least one of the two.
    if (!skinId && !accessoryId) {
      window.alert('Pick a skin or an accessory first.');
      return;
    }

    button.disabled = true;

    try {
      const body = new URLSearchParams({ teddyId });
      if (skinId) body.set('skinId', skinId);
      if (accessoryId) body.set('accessoryId', accessoryId);

      const response = await fetch('/api/teddies/customize', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });

      if (response.ok) {
        window.alert('Customization applied successfully!');
        return;
      }

      const message = {
        400: 'That customisation request was not valid.',
        401: 'Please log in to customise your teddies.',
        403: 'That teddy is not yours.',
        404: 'That teddy no longer exists.'
      }[response.status] || 'Failed to apply customization.';

      window.alert(message);
    } catch (error) {
      console.error('Failed to apply customization:', error.message);
      window.alert('Failed to apply customization.');
    } finally {
      button.disabled = false;
    }
  });
});
