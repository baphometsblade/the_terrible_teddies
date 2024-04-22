document.addEventListener('DOMContentLoaded', function() {
  fetch('/game/end-game')
    .then(response => response.json())
    .then(data => {
      const contentDiv = document.getElementById('endGameContent');
      if (data.arenas.length === 0 && data.bosses.length === 0) {
        contentDiv.innerHTML = '<p>No end game content available at this moment.</p>';
        console.log('No end game content found.');
      } else {
        contentDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
        console.log('End-game content loaded successfully.');
      }
    })
    .catch(error => {
      console.error('Error loading end-game content:', error.message);
      const contentDiv = document.getElementById('endGameContent');
      contentDiv.innerHTML = '<p>Error loading end-game content. Please try again later.</p>';
    });
});