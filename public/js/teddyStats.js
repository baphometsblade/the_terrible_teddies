import { fetchTeddyData } from './utils/fetchData';

document.addEventListener('DOMContentLoaded', function () {
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

  const fetchAndUpdateTeddyData = async () => {
    try {
      const teddyData = await fetchTeddyData('/api/game/latest-teddy-stats');
      updateStatsUI(teddyData);
    } catch (error) {
      console.error('Error fetching teddy data:', error.message);
      console.error('Error stack:', error.stack);
    }
  };

  fetchAndUpdateTeddyData();
  setInterval(fetchAndUpdateTeddyData, 5000); // Fetch latest data every 5 seconds
});
