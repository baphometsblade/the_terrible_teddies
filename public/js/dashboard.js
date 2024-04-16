// Dashboard JavaScript functionalities

document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard script loaded');

    // Fetch teddy collection and display
    fetchTeddyCollection();

    // Fetch recent battles and display
    fetchRecentBattles();

    // Equip item form submission handling
    const equipForm = document.querySelector('form[action="/items/equip"]');
    if (equipForm) {
        equipForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(equipForm);
            fetch('/items/equip', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                // Update the UI dynamically to reflect the equipped item without reloading the page
                if (data.success) {
                    updateTeddyCollectionUI(data.teddyId, data.itemId);
                }
            })
            .catch(error => {
                console.error('Error equipping item:', error.message, error.stack);
            });
        });
    } else {
        console.log('Equip item form not found.');
    }

    // Unequip item form submission handling
    const unequipForm = document.querySelectorAll('form[action="/items/unequip"]');
    unequipForm.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(form);
            fetch('/items/unequip', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                // Update the UI dynamically to reflect the unequipped item without reloading the page
                if (data.success) {
                    updateTeddyCollectionUI(data.teddyId, null);
                }
            })
            .catch(error => {
                console.error('Error unequipping item:', error.message, error.stack);
            });
        });
    });
});

function fetchTeddyCollection() {
    fetch('/game/teddies')
        .then(response => response.json())
        .then(data => {
            console.log('Fetched teddy collection:', data);
            displayTeddyCollection(data);
        })
        .catch(error => {
            console.error('Error fetching teddy collection:', error.message, error.stack);
        });
}

function displayTeddyCollection(teddies) {
    const collectionContainer = document.getElementById('teddy-collection');
    if (collectionContainer) {
        collectionContainer.innerHTML = ''; // Clear existing content
        teddies.forEach(teddy => {
            const teddyElement = document.createElement('div');
            teddyElement.className = 'teddy';
            teddyElement.innerHTML = `
                <h3>${teddy.name}</h3>
                <p>Health: ${teddy.health}, Attack: ${teddy.attackDamage}</p>
                <p>Items: ${teddy.items.map(item => item.name).join(', ') || 'None'}</p>
            `;
            collectionContainer.appendChild(teddyElement);
        });
        console.log('Displayed teddy collection');
    } else {
        console.log('Teddy collection container not found.');
    }
}

function updateTeddyCollectionUI(teddyId, itemId) {
    // Placeholder function to update the UI with the equipped item details
    // This function should locate the teddy in the collection and update its display to show the equipped item
    console.log(`Updated UI for teddy ${teddyId} with item ${itemId}`);
    fetchTeddyCollection(); // Refresh the teddy collection to reflect the changes
}

function fetchRecentBattles() {
    fetch('/game/recentBattles')
        .then(response => response.json())
        .then(data => {
            console.log('Fetched recent battles:', data);
            displayRecentBattles(data);
        })
        .catch(error => {
            console.error('Error fetching recent battles:', error.message, error.stack);
        });
}

function displayRecentBattles(battles) {
    const battlesContainer = document.getElementById('recent-battles');
    if (battlesContainer) {
        battlesContainer.innerHTML = ''; // Clear existing content
        battles.forEach(battle => {
            const battleElement = document.createElement('div');
            battleElement.className = 'battle';
            battleElement.innerHTML = `
                <p>${battle.description}</p>
                <p>Outcome: ${battle.outcome}</p>
            `;
            battlesContainer.appendChild(battleElement);
        });
        console.log('Displayed recent battles');
    } else {
        console.log('Recent battles container not found.');
    }
}