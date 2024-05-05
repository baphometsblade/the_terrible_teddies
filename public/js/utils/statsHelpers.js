// This module provides helper functions for teddy bear statistics management

/**
 * Fetches teddy bear data from the server.
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
    console.error('Error fetching teddy data:', error.message, error.stack);
    throw error; // Rethrow to handle it in the calling context
  }
}

/**
 * Updates the UI with the latest teddy bear statistics.
 * @param {Object} teddyData - The teddy data to display.
 */
function updateTeddyStatsUI(teddyData) {
  try {
    // Assuming there's a predefined area in the UI for teddy stats
    const statsArea = document.getElementById('teddyStatsArea');
    statsArea.innerHTML = ''; // Clear current stats

    // Dynamically create and append stats content
    Object.entries(teddyData).forEach(([key, value]) => {
      const statElement = document.createElement('p');
      statElement.textContent = `${key}: ${value}`;
      statsArea.appendChild(statElement);
    });

    console.log('Successfully updated teddy stats in the UI.');
  } catch (error) {
    console.error('Error updating teddy stats UI:', error.message, error.stack);
  }
}

/**
 * Periodically fetches and updates teddy bear statistics.
 * @param {string} url - The URL to fetch teddy data from.
 */
function autoUpdateTeddyStats(url) {
  try {
    fetchTeddyData(url)
      .then(updateTeddyStatsUI)
      .catch((error) => {
        console.error('Failed to auto-update teddy stats:', error.message, error.stack);
      });

    // Refresh teddy stats every 60 seconds
    setInterval(() => {
      fetchTeddyData(url)
        .then(updateTeddyStatsUI)
        .catch((error) => {
          console.error('Failed to auto-update teddy stats:', error.message, error.stack);
        });
    }, 60000);

    console.log('Auto-update for teddy stats initiated.');
  } catch (error) {
    console.error('Error setting up auto-update for teddy stats:', error.message, error.stack);
  }
}

export { fetchTeddyData, updateTeddyStatsUI, autoUpdateTeddyStats };