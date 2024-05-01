document.addEventListener('DOMContentLoaded', function () {
  console.log(
    'End Game JS loaded. Implement dynamic content loading or animations as needed.'
  );

  // Fetch arenas and bosses data from the server
  fetch('/api/end-game-data') // Assuming this is the correct endpoint URL for fetching end-game data
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then((data) => {
      console.log('Successfully fetched end game data:', data);
      // Assuming data contains { arenas: [], bosses: [] }
      const arenas = data.arenas;
      const bosses = data.bosses;

      // Dynamically populate arenas and bosses sections
      const arenasSection = document.querySelector('.arena-section .row');
      const bossesSection = document.querySelector('.bosses-section .row');

      arenas.forEach((arena) => {
        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-4 mb-4';
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        const cardBodyDiv = document.createElement('div');
        cardBodyDiv.className = 'card-body';
        cardBodyDiv.innerHTML = `
          <h3 class="card-title">${arena.name}</h3>
          <p>Difficulty: ${arena.difficulty}</p>
          <p>Environment: ${arena.environment}</p>
        `;
        cardDiv.appendChild(cardBodyDiv);
        colDiv.appendChild(cardDiv);
        arenasSection.appendChild(colDiv);
      });

      bosses.forEach((boss) => {
        const colDiv = document.createElement('div');
        colDiv.className = 'col-md-4 mb-4';
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        const cardBodyDiv = document.createElement('div');
        cardBodyDiv.className = 'card-body';
        cardBodyDiv.innerHTML = `
          <h3 class="card-title">${boss.name}</h3>
          <p>Health: ${boss.health}</p>
          <p>Attack Damage: ${boss.attackDamage}</p>
          <p>Special Move: ${boss.specialMove}</p>
          <p>Arena: ${boss.arena.name}</p>
        `;
        cardDiv.appendChild(cardBodyDiv);
        colDiv.appendChild(cardDiv);
        bossesSection.appendChild(colDiv);
      });
    })
    .catch((error) => {
      console.error(
        'Error fetching end game data:',
        error.message,
        error.stack
      );
    });
});
