// battleArenaUI.js

$(document).ready(function() {
    // Update health bars based on the current health of the teddies
    function updateHealthBars(playerTeddy, opponentTeddy) {
        const playerHealthPercent = (playerTeddy.currentHealth / playerTeddy.health) * 100;
        const opponentHealthPercent = (opponentTeddy.currentHealth / opponentTeddy.health) * 100;
        $('#player-health-bar').css('width', playerHealthPercent + '%');
        $('#opponent-health-bar').css('width', opponentHealthPercent + '%');
    }

    // Display attack animations
    function showAttackAnimation(attacker) {
        const attackerElement = attacker === 'player' ? '#player-hand' : '#opponent-hand';
        $(attackerElement).addClass('attacking');
        setTimeout(() => {
            $(attackerElement).removeClass('attacking');
        }, 1000);
    }

    // Display special move animations
    function showSpecialMoveAnimation(attacker) {
        const attackerElement = attacker === 'player' ? '#player-hand' : '#opponent-hand';
        $(attackerElement).addClass('special-move');
        setTimeout(() => {
            $(attackerElement).removeClass('special-move');
        }, 2000);
    }

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
                updateHealthBars(battleState.playerTeddy, battleState.opponentTeddy);
                if (move === 'attack') {
                    showAttackAnimation('player');
                } else if (move === 'special') {
                    showSpecialMoveAnimation('player');
                }
                // Check for winner and update UI
                if (battleState.winner) {
                    $('#battle-controls').html(`<p>Battle Over. Winner: ${battleState.winner}</p>`);
                }
            },
            error: function() {
                alert('An error occurred while executing the move. Please try again.');
            }
        });
    }
});