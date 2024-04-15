// battleArenaUI.js

$(document).ready(function() {
    // Update health bars based on the current health of the teddies
    function updateHealthBars(playerTeddy, opponentTeddy) {
        const playerHealthPercent = (playerTeddy.currentHealth / playerTeddy.health) * 100;
        const opponentHealthPercent = (opponentTeddy.currentHealth / opponentTeddy.health) * 100;
        $('#player-hand .health-bar-filled').css('width', playerHealthPercent + '%');
        $('#opponent-hand .health-bar-filled').css('width', opponentHealthPercent + '%');
        console.log('Health bars updated');
    }

    // Display attack animations
    function showAttackAnimation(attacker) {
        const attackerElement = attacker === 'player' ? '#player-hand .teddy-card' : '#opponent-hand .teddy-card';
        $(attackerElement).addClass('attack-animation');
    }

    // Display special move animations
    function showSpecialMoveAnimation(attacker) {
        const attackerElement = attacker === 'player' ? '#player-hand .teddy-card' : '#opponent-hand .teddy-card';
        $(attackerElement).addClass('special-move-animation');
    }

    // Remove animation classes after the animation ends
    $('.teddy-card').on('animationend', function() {
        $(this).removeClass('attack-animation special-move-animation');
        console.log('Animation ended and classes removed');
    });

    // Handle attack button click
    $('#attack-button').click(function() {
        executePlayerMove('attack');
    });

    // Handle special move button click
    $('#special-move-button').click(function() {
        executePlayerMove('special');
    });

    // Execute player move and update UI accordingly
    function executePlayerMove(move) {
        $.ajax({
            url: '/game/execute-turn',
            type: 'POST',
            data: { move: move },
            success: function(battleState) {
                console.log('Turn executed. Move: ' + move);
                updateHealthBars(battleState.playerTeddy, battleState.opponentTeddy);
                if (move === 'attack') {
                    showAttackAnimation('player');
                } else if (move === 'special') {
                    showSpecialMoveAnimation('player');
                }
                // Check for winner and update UI
                if (battleState.winner) {
                    $('#battle-controls').html(`<p>Battle Over. Winner: ${battleState.winner}</p>`);
                    console.log('Battle over. Winner: ' + battleState.winner);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert('An error occurred while executing the move. Please try again.');
                console.error('Error executing move:', textStatus, errorThrown, jqXHR);
            }
        });
    }
});