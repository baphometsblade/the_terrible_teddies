import { fetchTeddyData } from './utils/fetchData';

document.addEventListener('DOMContentLoaded', function () {
  const updateUI = async () => {
    try {
      const teddyData = await fetchTeddyData('/api/game/latest-teddy-stats');
      // Assuming there's logic here to update the UI with the fetched data
      console.log('Updated UI with fetched teddy data:', teddyData);
    } catch (error) {
      console.error(
        'Error updating UI with teddy data:',
        error.message,
        error.stack,
      );
    }
  };

  updateUI();
  setInterval(updateUI, 5000); // Fetch latest data every 5 seconds
});