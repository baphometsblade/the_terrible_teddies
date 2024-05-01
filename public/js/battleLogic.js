import { addEventListenerToSelector } from './utils/eventListeners';

document.addEventListener('DOMContentLoaded', function () {
  const teddiesCollection = document.getElementById('teddies-collection');
  const selectedTeddyIdsInput = document.getElementById('selectedTeddyIds');

  addEventListenerToSelector(
    '#teddies-collection .select-teddy',
    'click',
    function (event) {
      const teddyId = event.target.dataset.teddyId;
      const teddyCard = event.target.closest('.teddy-card');
      toggleTeddySelection(teddyId, teddyCard);
    }
  );

  function toggleTeddySelection(teddyId, teddyCard) {
    let selectedIds = selectedTeddyIdsInput.value
      ? selectedTeddyIdsInput.value.split(',')
      : [];
    if (selectedIds.includes(teddyId)) {
      selectedIds = selectedIds.filter((id) => id !== teddyId);
      teddyCard.classList.remove('selected');
      teddyCard.classList.remove('selected-teddy'); // Toggle visual indication for selection
    } else {
      selectedIds.push(teddyId);
      teddyCard.classList.add('selected');
      teddyCard.classList.add('selected-teddy'); // Toggle visual indication for selection
    }
    selectedTeddyIdsInput.value = selectedIds.join(',');
    console.log(`Updated selected teddies: ${selectedTeddyIdsInput.value}`);
  }
});
