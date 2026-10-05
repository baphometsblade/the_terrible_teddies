// Live teddy stats panel.
//
// Three fixes here:
//
// 1. Stored XSS. This interpolated teddyData.name, specialMove and rarity into
//    a template string assigned to innerHTML. Teddy names are user-influenced,
//    so a crafted name executed in the browser of anyone viewing the panel.
//    Values are now set with textContent.
//
// 2. Runaway polling. setInterval fired every 5 seconds with no stop condition,
//    so a failing request was retried forever. It now backs off and gives up.
//
// 3. The endpoint /api/game/latest-teddy-stats does not exist anywhere in the
//    routes - every poll 404'd. The URL is kept as the intended contract, but
//    the panel now fails visibly instead of silently retrying into the void.
//    Build that route to light this up.

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('teddy-stats');
  if (!container) return;

  const POLL_MS = 5000;
  const MAX_CONSECUTIVE_FAILURES = 3;

  let failures = 0;
  let timer = null;

  const row = (label, value) => {
    const p = document.createElement('p');
    // textContent, not innerHTML: a teddy name is attacker-influenced data,
    // not markup.
    p.textContent = `${label}: ${value ?? 'unknown'}`;
    return p;
  };

  const render = (teddy) => {
    const name = document.createElement('h3');
    name.textContent = teddy.name ?? 'Unknown teddy';

    container.replaceChildren(
      name,
      row('Attack Damage', teddy.attackDamage),
      row('Health', teddy.health),
      row('Special Move', teddy.specialMove),
      row('Rarity', teddy.rarity)
    );
  };

  const showError = (text) => {
    container.replaceChildren(Object.assign(document.createElement('p'), { textContent: text }));
  };

  const stopPolling = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/game/latest-teddy-stats');
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      render(await response.json());
      failures = 0;
    } catch (error) {
      failures += 1;
      console.error(`Error fetching teddy data (attempt ${failures}):`, error.message);

      if (failures >= MAX_CONSECUTIVE_FAILURES) {
        stopPolling();
        showError('Live teddy stats are unavailable.');
        console.error('Giving up on /api/game/latest-teddy-stats after repeated failures.');
      }
    }
  };

  fetchStats();
  timer = setInterval(fetchStats, POLL_MS);

  // Don't keep polling a page nobody is looking at.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopPolling();
    } else if (timer === null && failures < MAX_CONSECUTIVE_FAILURES) {
      fetchStats();
      timer = setInterval(fetchStats, POLL_MS);
    }
  });
});
