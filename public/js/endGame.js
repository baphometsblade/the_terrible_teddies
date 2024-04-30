document.addEventListener('DOMContentLoaded', function() {
  fetch('/api/events/active')
    .then(response => response.json())
    .then(data => {
      const contentDiv = document.getElementById('endGameContent');
      if (data.length === 0) {
        contentDiv.innerHTML = '<p>No active events available at this moment.</p>';
        console.log('No active events found.');
      } else {
        let eventsHtml = '<h2>Active Events</h2>';
        data.forEach(event => {
          eventsHtml += `<div><h3>${event.title}</h3><p>${event.description}</p><p>Starts: ${new Date(event.startDate).toLocaleDateString()} - Ends: ${new Date(event.endDate).toLocaleDateString()}</p></div>`;
        });
        contentDiv.innerHTML = eventsHtml;
        console.log('Active events loaded successfully.');
      }
    })
    .catch(error => {
      console.error('Error loading active events:', error.message, error.stack);
      const contentDiv = document.getElementById('endGameContent');
      contentDiv.innerHTML = '<p>Error loading active events. Please try again later.</p>';
    });
});