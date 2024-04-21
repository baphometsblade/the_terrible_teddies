$(document).ready(function() {
    // Handle teddy selection for lineup
    $('.teddy-select').click(function() {
        var teddyId = $(this).data('teddy-id');
        $.ajax({
            url: '/api/select-teddy', // Updated URL to match server routes
            type: 'POST',
            data: { teddyId: teddyId },
            success: function(response) {
                // Update UI to reflect teddy selection
                if (response.success) {
                    // Assuming there's a UI element to show selected teddies
                    $('#selected-teddies').append('<div>' + response.teddyName + '</div>');
                } else {
                    alert('Failed to select teddy: ' + response.message);
                }
                console.log('Teddy selected:', response);
            },
            error: function(error) {
                alert('Error selecting teddy. Please try again.');
            }
        });
    });

    // Handle battle initiation
    $('#initiate-battle').click(function() {
        $.ajax({
            url: '/api/initiate-battle', // Updated URL to match server routes
            type: 'POST',
            success: function(response) {
                // Navigate to battle screen
                if (response.success) {
                    window.location.href = '/battle'; // Assuming '/battle' is the battle screen route
                } else {
                    alert('Failed to initiate battle: ' + response.message);
                }
                console.log('Battle initiated:', response);
            },
            error: function(error) {
                alert('Error initiating battle. Please try again.');
            }
        });
    });

    // Handle turn execution during battle
    $('.execute-turn').click(function() {
        var moveId = $(this).data('move-id');
        $.ajax({
            url: '/api/execute-turn', // Updated URL to match server routes
            type: 'POST',
            data: { moveId: moveId },
            success: function(response) {
                // Update UI to reflect turn execution
                if (response.success) {
                    // Assuming there's a UI element to show the result of the turn
                    $('#battle-log').append('<div>' + response.turnResult + '</div>');
                } else {
                    alert('Failed to execute turn: ' + response.message);
                }
                console.log('Turn executed:', response);
            },
            error: function(error) {
                alert('Error executing turn. Please try again.');
            }
        });
    });
});