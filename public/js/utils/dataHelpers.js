// Utility functions for data handling in the Terrible Teddies game

/**
 * Fetches teddy data from the server.
 * @param {string} url - The URL to fetch teddy data from.
 * @returns {Promise<Object>} The fetched teddy data.
 */
async function fetchTeddyData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Successfully fetched teddy data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching teddy data:', error.message);
    console.error(error.stack);
    throw error; // Rethrow to handle it in the calling context
  }
}

/**
 * Updates the UI with teddy statistics.
 * @param {Object} teddyData - The teddy data to display.
 */
function updateTeddyStatsUI(teddyData) {
  try {
    // Assuming there's a predefined element for displaying teddy stats
    const teddyStatsElement = document.getElementById('teddyStats');
    if (!teddyStatsElement) {
      throw new Error('Teddy stats element not found in the document.');
    }
    teddyStatsElement.textContent = `Attack: ${teddyData.attack}, Health: ${teddyData.health}`;
    console.log('Successfully updated teddy stats UI.');
  } catch (error) {
    console.error('Error updating teddy stats UI:', error.message);
    console.error(error.stack);
  }
}

/**
 * Periodically updates teddy statistics from the server.
 * @param {string} url - The URL to fetch teddy data from.
 */
function autoUpdateTeddyStats(url) {
  setInterval(async () => {
    try {
      const teddyData = await fetchTeddyData(url);
      updateTeddyStatsUI(teddyData);
    } catch (error) {
      console.error('Error fetching teddy data for auto-update:', error.message);
      console.error(error.stack);
    }
  }, 5000); // Update every 5 seconds
  console.log('Auto-update for teddy stats initiated.');
}

export { fetchTeddyData, updateTeddyStatsUI, autoUpdateTeddyStats };