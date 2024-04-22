document.addEventListener('DOMContentLoaded', function() {
    const teddiesCollection = document.getElementById('teddies-collection');
    const selectedTeddyIdsInput = document.getElementById('selectedTeddyIds');

    teddiesCollection.addEventListener('click', function(event) {
        if (event.target.classList.contains('select-teddy')) {
            const teddyId = event.target.dataset.teddyId;
            const teddyCard = event.target.closest('.teddy-card');
            toggleTeddySelection(teddyId, teddyCard);
        }
    });

    function toggleTeddySelection(teddyId, teddyCard) {
        let selectedIds = selectedTeddyIdsInput.value ? selectedTeddyIdsInput.value.split(',') : [];
        if (selectedIds.includes(teddyId)) {
            selectedIds = selectedIds.filter(id => id !== teddyId);
            teddyCard.classList.toggle('selected');
            teddyCard.classList.toggle('selected-teddy'); // Toggle visual indication for selection
        } else {
            selectedIds.push(teddyId);
            teddyCard.classList.toggle('selected');
            teddyCard.classList.toggle('selected-teddy'); // Toggle visual indication for selection
        }
        selectedTeddyIdsInput.value = selectedIds.join(',');
        console.log(`Updated selected teddies: ${selectedTeddyIdsInput.value}`);
    }
});