import { addEventListenerToSelector } from './utils/eventListeners';

document.addEventListener('DOMContentLoaded', function () {
  addEventListenerToSelector('.select-teddy', 'click', function () {
    const teddyId = this.dataset.teddyId;
    if (!teddyId) {
      console.error('Error: Teddy ID is missing from the dataset.');
      return;
    }
    const teddyCard = this.closest('.teddy-card');
    if (!teddyCard) {
      console.error(
        'Error: .teddy-card element not found in the DOM for teddy ID:',
        teddyId,
      );
      return;
    }
    teddyCard.classList.toggle('selected-teddy');
    console.log(`Toggle selection for teddy ID: ${teddyId}`);
  });

  // Error handling for missing teddy data or elements not found
  if (!document.querySelector('.select-teddy')) {
    console.error('Error: .select-teddy elements not found in the DOM');
  }
});
