$(document).ready(function() {
    // Attach click event listener to all select buttons for teddies
    $('.select-teddy-button').on('click', function() {
        const teddyId = $(this).data('teddy-id');
        if (!teddyId) {
            console.error('Teddy ID not found.');
            return;
        }

        // Highlight the selected teddy visually
        $('.select-teddy-button').not(this).removeClass('selected');
        $(this).addClass('selected');

        // AJAX request to add the selected teddy to the player's lineup
        $.ajax({
            url: '/game/select-teddy', // Replaced placeholder with actual URL
            type: 'POST',
            data: { teddyId: teddyId },
            success: function(response) {
                console.log('Teddy selected successfully', response);
                if (response && response.teddy && response.teddy.name) {
                    // Update the user hand visually with the selected teddy
                    $('#user-hand').html(`<div class="teddy-selected">Teddy ${response.teddy.name} selected</div>`);
                } else {
                    console.error('Invalid response structure:', response);
                }
                // Redirect to the battle setup or confirmation page
                window.location.href = '/game/battle-setup'; // Replaced placeholder with actual URL
            },
            error: function(xhr, status, error) {
                console.error('Error selecting teddy:', error.toString());
            }
        });
    });
});