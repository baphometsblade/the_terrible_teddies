$(document).on('click', '#attack-button', function() {
  executeTurn({ special: false });
});

$(document).on('click', '#special-move-button', function() {
  executeTurn({ special: true });
});

function executeTurn(playerMove) {
  $.ajax({
    url: '/game/execute-turn',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ move: playerMove }),
    success: function(updatedBattleState) {
      console.log('Turn executed successfully:', updatedBattleState);
      updateBattleUI(updatedBattleState);
    },
    error: function(xhr, status, error) {
      console.error('Error executing turn:', xhr.responseText, status, error);
      alert('Error executing turn: ' + xhr.responseText);
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