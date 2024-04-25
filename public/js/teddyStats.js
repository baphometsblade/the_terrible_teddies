document.addEventListener('DOMContentLoaded', function() {

    const updateStatsUI = (teddyData) => {
        const teddyStatsContainer = document.getElementById('teddy-stats');
        if (!teddyStatsContainer) {
            console.error('Teddy stats container not found on the page.');
            return;
        }
        teddyStatsContainer.innerHTML = `
            <h3>${teddyData.name}</h3>
            <p>Attack Damage: ${teddyData.attackDamage}</p>
            <p>Health: ${teddyData.health}</p>
            <p>Special Move: ${teddyData.specialMove}</p>
            <p>Rarity: ${teddyData.rarity}</p>
        `;
    };

    const fetchTeddyData = async () => {
        try {
            const response = await fetch('/api/game/latest-teddy-stats');
            if (!response.ok) {
                throw new Error(`Failed to fetch teddy data: ${response.status} ${response.statusText}`);
            }
            const teddyData = await response.json();
            updateStatsUI(teddyData);
        } catch (error) {
            console.error('Error fetching teddy data:', error.message);
            console.error('Error stack:', error.stack);
        }
    };

    fetchTeddyData();
    setInterval(fetchTeddyData, 5000); // Fetch latest data every 5 seconds
});