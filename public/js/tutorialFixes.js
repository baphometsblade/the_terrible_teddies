document.addEventListener('DOMContentLoaded', function() {
    // Check if the tutorial has been viewed
    const tutorialViewed = localStorage.getItem('tutorialViewed');

    if (!tutorialViewed) {
        // Show a button or link to the tutorial if it hasn't been viewed
        const tutorialButton = document.createElement('button');
        tutorialButton.textContent = 'View Tutorial';
        tutorialButton.classList.add('btn', 'btn-primary', 'fixed-bottom', 'm-3');
        tutorialButton.style.position = 'fixed';
        tutorialButton.style.right = '20px';
        tutorialButton.style.bottom = '20px';
        tutorialButton.onclick = function() {
            window.location.href = '/tutorial';
        };

        document.body.appendChild(tutorialButton);
    }

    // Mark the tutorial as viewed when on the tutorial page
    if (window.location.pathname === '/tutorial') {
        localStorage.setItem('tutorialViewed', 'true');
    }
});