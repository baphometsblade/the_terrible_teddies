$(document).ready(function() {
  // Event listener for attack button click
  $(document).on('click', '#attack-button', function() {
    executeTurn('attack');
  });

  // Event listener for special move button click
  $(document).on('click', '#special-move-button', function() {
    executeTurn('special');
  });

  // Function to execute a turn with the given move
  function executeTurn(move) {
    $.ajax({
      url: '/game/execute-turn',
      type: 'POST',
      contentType: 'application/x-www-form-urlencoded',
      data: { move: move },
      success: function(updatedBattleState) {
        console.log('Turn executed successfully:', updatedBattleState);
        updateBattleUI(updatedBattleState);
      },
      error: function(xhr, status, error) {
        var errorMessage = xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : 'An unexpected error occurred while executing the turn. Please try again.';
        console.error('Error executing turn:', errorMessage, error);
        alert('Error executing turn: ' + errorMessage);
      }
    });
  }

  // Function to update the battle UI with the new state
  function updateBattleUI(battleState) {
    // Update health bars based on the current health of the teddies
    $('#player-hand .teddy-card .health-bar-filled').css('width', (battleState.playerTeddy.currentHealth / battleState.playerTeddy.health) * 100 + '%');
    $('#opponent-hand .teddy-card .health-bar-filled').css('width', (battleState.opponentTeddy.currentHealth / battleState.opponentTeddy.health) * 100 + '%');
    $('#battle-field .battle-turn').text('Turn: ' + battleState.turn);

    // Display the winner and end the game if there is one
    if (battleState.winner) {
      $('#battle-controls').html('<p>Battle Over. Winner: ' + battleState.winner + '</p><a href="/teddies" class="btn btn-primary">Return to Teddies</a>');
      console.log('Battle over. Winner:', battleState.winner);
    } else {
      console.log('Battle status updated. Current turn:', battleState.turn);
      // Enable or disable buttons based on whose turn it is
      if (battleState.turn === 'player') {
        $('#attack-button').prop('disabled', false);
        $('#special-move-button').prop('disabled', false);
      } else {
        $('#attack-button').prop('disabled', true);
        $('#special-move-button').prop('disabled', true);
      }
    }
  }
});