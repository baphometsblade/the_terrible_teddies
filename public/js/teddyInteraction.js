document.addEventListener('DOMContentLoaded', () => {
    const teddies = document.querySelectorAll('.card');
    teddies.forEach(teddy => {
        teddy.addEventListener('click', () => {
            const teddyId = teddy.getAttribute('data-teddy-id');
            const image = document.querySelector(`#img-${teddyId}`);
            const audio = new Audio(`/assets/sounds/${teddyId}.wav`);
            const animationCSS = `/assets/animations/${teddyId}.css`;

            // Load and apply the CSS for animation
            if (!document.getElementById(`css-${teddyId}`)) {
                const head = document.head;
                const link = document.createElement('link');

                link.id = `css-${teddyId}`;
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = animationCSS;
                link.media = 'all';
                head.appendChild(link);

                console.log(`CSS for ${teddyId} loaded and applied.`);
            }

            // Start animation and sound
            image.classList.add(`${teddyId.replace(/ /g, '-')}-animation`);
            audio.play().catch(error => {
                console.error('Error playing audio:', error.message);
                console.error(error.stack);
            });

            console.log(`Animation and sound initiated for ${teddyId}.`);
        });
    });
});
