$(document).ready(function() {
    $('#lineup-form').on('submit', function(event) {
        event.preventDefault(); // Prevent the default form submission

        // Collect selected teddy IDs
        let selectedTeddyIds = [];
        $('.select-teddy').each(function() {
            if ($(this).hasClass('selected')) {
                selectedTeddyIds.push($(this).closest('.teddy-card').data('teddy-id'));
            }
        });

        if (selectedTeddyIds.length === 0) {
            $('#error-message').text('Please select at least one teddy to initiate battle.').show();
            return;
        }

        $.ajax({
            url: '/game/initiate-battle',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ selectedTeddyIds: selectedTeddyIds }),
            success: function(response) {
                console.log('Battle initiated successfully', response);
                window.location.href = '/game/battle-arena'; // Redirect to the battle arena on success
            },
            error: function(xhr, status, error) {
                var errorMessage = xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : 'An error occurred while initiating the battle. Please try again.';
                $('#error-message').text(errorMessage).show(); // Display the error message
                console.error("Error initiating battle: " + errorMessage + ". Status: " + status + ". Error: ", error); // Log the error details
            }
        });
    });

    // Event handler for selecting teddies
    $('.select-teddy').click(function() {
        $(this).toggleClass('selected');
        let selectedTeddyIds = [];
        $('.select-teddy.selected').each(function() {
            selectedTeddyIds.push($(this).closest('.teddy-card').data('teddy-id'));
        });
        $('#selectedTeddyIds').val(selectedTeddyIds.join(','));
    });
});