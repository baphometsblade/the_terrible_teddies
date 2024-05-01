// This script handles interactions within the arena GUI, including event listeners and AJAX requests.

document.addEventListener('DOMContentLoaded', function() {
    // Fetch and display arena data
    fetchArenaData();

    // Event listener for initiating battles
    document.querySelectorAll('.battle-initiate-btn').forEach(button => {
        button.addEventListener('click', function(event) {
            const arenaId = this.getAttribute('data-arena-id');
            initiateBattle(arenaId);
        });
    });
});

function fetchArenaData() {
    fetch('/api/arenas')
        .then(response => response.json())
        .then(data => {
            displayArenaData(data);
        })
        .catch(error => {
            console.error('Error fetching arena data:', error);
            alert('Failed to load arena data. Please try again later.');
        });
}

function displayArenaData(data) {
    const arenaContainer = document.getElementById('arena-container');
    arenaContainer.innerHTML = ''; // Clear existing content
    data.forEach(arena => {
        const arenaElement = document.createElement('div');
        arenaElement.className = 'arena';
        arenaElement.innerHTML = `
            <h3>${arena.name}</h3>
            <p>Difficulty: ${arena.difficulty}</p>
            <button class="battle-initiate-btn" data-arena-id="${arena._id}">Initiate Battle</button>
        `;
        arenaContainer.appendChild(arenaElement);
    });
}

function initiateBattle(arenaId) {
    fetch(`/api/battles/initiate/${arenaId}`, {
        method: 'POST'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to initiate battle');
        }
        return response.json();
    })
    .then(data => {
        console.log('Battle initiated successfully:', data);
        alert('Battle initiated! Good luck!');
    })
    .catch(error => {
        console.error('Error initiating battle:', error);
        alert('Failed to initiate battle. Please try again.');
    });
}