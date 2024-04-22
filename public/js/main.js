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
                console.error('Error selecting teddy:', error.responseText, error.stack);
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
                console.error('Error initiating battle:', error.responseText, error.stack);
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
                console.error('Error executing turn:', error.responseText, error.stack);
                alert('Error executing turn. Please try again.');
            }
        });
    });

    // Handle challenge completion
    $('.complete-challenge').click(function() {
        var challengeId = $(this).data('challenge-id');
        $.ajax({
            url: '/challenges/complete', // Updated URL to match server routes
            type: 'POST',
            data: { challengeId: challengeId },
            success: function(response) {
                if (response.success) {
                    alert('Challenge completed! Rewards have been added to your account.');
                    window.location.reload(); // Refresh the page to update the challenge list
                } else {
                    alert('Failed to complete challenge: ' + response.message);
                }
                console.log('Challenge completed:', response);
            },
            error: function(error) {
                console.error('Error completing challenge:', error.responseText, error.stack);
                alert('Failed to complete challenge. Please try again.');
            }
        });
    });
});