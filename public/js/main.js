$(document).ready(function() {
    // The teddy selection logic has been moved to battleLogic.js for better separation of concerns

    // Load and display assets for each teddy when selected or when its special move is used
    $('.select-teddy').click(function() {
        const teddyId = $(this).data('teddy-id');
        const imageUrl = `/assets/images/${teddyId}.jpg`;
        const soundUrl = `/assets/sounds/${teddyId}.wav`;
        const animationUrl = `/assets/animations/${teddyId}.css`;

        // Load the image for the selected teddy
        $(`#img-${teddyId}`).attr('src', imageUrl).on('error', function() {
            $(this).attr('src', '/images/default.jpg'); // Fallback image if specific teddy image fails to load
            console.error(`Error loading image for teddy ID: ${teddyId}`);
        });

        // Load and play sound for the selected teddy
        const audio = new Audio(soundUrl);
        audio.play().catch(error => {
            console.error(`Error playing sound for teddy ID: ${teddyId}`, error.message, error.stack);
        });

        // Apply animation CSS dynamically
        if (!$(`#css-${teddyId}`).length) {
            $('<link>')
                .attr('id', `css-${teddyId}`)
                .attr('rel', 'stylesheet')
                .attr('type', 'text/css')
                .attr('href', animationUrl)
                .appendTo('head');
        }

        // Start animation
        $(`#img-${teddyId}`).addClass(`${teddyId.replace(/ /g, '-')}-animation`);

        console.log(`Assets loaded for teddy ID: ${teddyId}`);
    });
});
