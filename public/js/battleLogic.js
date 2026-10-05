// Teddy selection and battle initiation on the collection page.
//
// The form in views/teddies.ejs posted to /battle, which has no handler - so
// "Initiate Battle" 404'd. The real server flow is two steps:
//
//   POST /game/choose-lineup   { lineup: [id, id] }   (JSON, exactly 2)
//   POST /game/initiate-battle                        (reads the session lineup)
//   GET  /game/battle                                 (renders it)
//
// This drives that flow instead of submitting to a route that does not exist.
// The hidden selectedTeddyIds input is kept in sync so nothing else that reads
// it breaks.

document.addEventListener('DOMContentLoaded', () => {
  const collection = document.getElementById('teddies-collection');
  const hiddenInput = document.getElementById('selectedTeddyIds');
  const form = document.getElementById('lineup-form');

  if (!collection) return;

  const MAX_SELECTION = 2;
  const selected = [];

  const syncHiddenInput = () => {
    if (hiddenInput) hiddenInput.value = selected.join(',');
  };

  const setCardState = (card, isSelected) => {
    if (!card) return;
    card.classList.toggle('selected', isSelected);
    card.classList.toggle('selected-teddy', isSelected);
  };

  collection.addEventListener('click', (event) => {
    const button = event.target.closest('.select-teddy');
    if (!button) return;

    const teddyId = button.dataset.teddyId;
    if (!teddyId) return;

    const card = button.closest('.teddy-card');
    const index = selected.indexOf(teddyId);

    if (index !== -1) {
      selected.splice(index, 1);
      setCardState(card, false);
      button.classList.remove('btn-secondary');
      button.classList.add('btn-outline-secondary');
    } else {
      if (selected.length >= MAX_SELECTION) {
        window.alert(`You can only select ${MAX_SELECTION} teddies for a battle.`);
        return;
      }
      selected.push(teddyId);
      setCardState(card, true);
      button.classList.remove('btn-outline-secondary');
      button.classList.add('btn-secondary');
    }

    syncHiddenInput();
  });

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (selected.length !== MAX_SELECTION) {
      window.alert(`Please select exactly ${MAX_SELECTION} teddies to start a battle.`);
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    const explain = (status) =>
      ({
        400: 'That lineup was not accepted. Pick two of your teddies and try again.',
        401: 'Please log in to start a battle.',
        404: 'One of those teddies could not be found.'
      })[status] || 'Could not start the battle. Please try again.';

    try {
      const lineupResponse = await fetch('/game/choose-lineup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lineup: selected })
      });

      if (!lineupResponse.ok) {
        window.alert(explain(lineupResponse.status));
        return;
      }

      const battleResponse = await fetch('/game/initiate-battle', { method: 'POST' });
      if (!battleResponse.ok) {
        window.alert(explain(battleResponse.status));
        return;
      }

      window.location.href = '/game/battle';
    } catch (error) {
      console.error('Error starting battle:', error.message);
      window.alert('Could not start the battle. Please try again.');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
});
