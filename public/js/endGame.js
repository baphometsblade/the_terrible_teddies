// Renders the active-events list.
//
// Two fixes here:
//
// 1. Stored XSS. This previously built HTML by interpolating event.title and
//    event.description into a template string and assigning it to innerHTML.
//    Those values come from the database, so any event whose title contained
//    markup executed in every visitor's browser. Nodes are now built with
//    textContent, which cannot be parsed as HTML.
//
// 2. Wrong endpoint. It called /api/events/active, which does not exist - the
//    route is /api/events. Every load 404'd, response.json() threw on the HTML
//    error page, and the catch block hid it behind a generic message.

document.addEventListener('DOMContentLoaded', () => {
  const contentDiv = document.getElementById('endGameContent');
  if (!contentDiv) return;

  const showMessage = (text) => {
    contentDiv.replaceChildren(Object.assign(document.createElement('p'), { textContent: text }));
  };

  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'unknown' : date.toLocaleDateString();
  };

  const buildEventCard = (event) => {
    const wrapper = document.createElement('div');

    const title = document.createElement('h3');
    title.textContent = event.title ?? 'Untitled event';

    const description = document.createElement('p');
    description.textContent = event.description ?? '';

    const dates = document.createElement('p');
    dates.textContent = `Starts: ${formatDate(event.startDate)} - Ends: ${formatDate(event.endDate)}`;

    wrapper.append(title, description, dates);
    return wrapper;
  };

  fetch('/api/events')
    .then((response) => {
      // The route answers 404 with JSON when there are simply no active events.
      if (response.status === 404) return [];
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const events = Array.isArray(data) ? data : [];
      if (events.length === 0) {
        showMessage('No active events available at this moment.');
        return;
      }

      const heading = document.createElement('h2');
      heading.textContent = 'Active Events';

      contentDiv.replaceChildren(heading, ...events.map(buildEventCard));
    })
    .catch((error) => {
      console.error('Error loading active events:', error.message);
      showMessage('Error loading active events. Please try again later.');
    });
});
