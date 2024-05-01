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
        $(`#img-${teddyId}`).addClass(`${teddyId}-animation`);

        console.log(`Assets loaded for teddy ID: ${teddyId}`);
    });

    // Enable dropdowns in Bootstrap
    $('.dropdown-toggle').dropdown();

    // Fix for game options dropdown not working
    $('.game-options-btn').on('click', function() {
        $('.game-options-dropdown').toggleClass('is-active');
        console.log('Game options dropdown toggled.');
    });

    // Ensure CSS for .game-options-dropdown.is-active makes it visible
    // Note: This requires corresponding CSS rules to be added or verified in public/css/style.css

    // Example modal interaction - Add this if a modal is needed
    $('#exampleModal').on('show.bs.modal', function (event) {
        var button = $(event.relatedTarget); // Button that triggered the modal
        var recipient = button.data('whatever'); // Extract info from data-* attributes
        var modal = $(this);
        modal.find('.modal-title').text('New message to ' + recipient);
        modal.find('.modal-body input').val(recipient);
    });
});