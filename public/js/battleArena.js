$(document).on('click', '#attack-button', function() {
  executeTurn('attack');
});

$(document).on('click', '#special-move-button', function() {
  executeTurn('special');
});

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

function updateBattleUI(battleState) {
  // Update health, status, and turn information
  $('#player-hand .teddy-card p.health').text('Health: ' + battleState.playerTeddy.currentHealth);
  $('#opponent-hand .teddy-card p.health').text('Health: ' + battleState.opponentTeddy.currentHealth);
  $('#battle-field p.turn').text('Turn: ' + battleState.turn);

  // Check for winner and update UI accordingly
  if (battleState.winner) {
    $('#battle-controls').html('<p>Battle Over. Winner: ' + battleState.winner + '</p><a href="/teddies" class="btn btn-primary">Return to Teddies</a>');
    console.log('Battle over. Winner:', battleState.winner);
  } else {
    console.log('Battle status updated. Current turn:', battleState.turn);
  }
}