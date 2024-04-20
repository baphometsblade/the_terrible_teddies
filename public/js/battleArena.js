// This file is intended to manage the battle arena interactions in the "Terrible Teddies" game.
// It should handle initiating battles, executing player and AI turns, and updating the UI accordingly.

$(document).ready(function() {
    // Initialize WebSocket connection for real-time battle updates
    // Dynamically determine the WebSocket server URL based on the current location
    const socketUrl = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/battle';
    const socket = new WebSocket(socketUrl);

    socket.onopen = function(event) {
        console.log('WebSocket connection established');
    };

    socket.onerror = function(error) {
        console.error('WebSocket error:', error);
    };

    socket.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'battleUpdate') {
                updateBattleUI(data.battleState);
            } else if (data.type === 'chatMessage') {
                displayChatMessage(data.message);
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    };

    // Function to update the battle UI based on the current state
    function updateBattleUI(battleState) {
        // Update health bars
        $('#playerHealth').css('width', battleState.playerHealth + '%').attr('aria-valuenow', battleState.playerHealth);
        $('#opponentHealth').css('width', battleState.opponentHealth + '%').attr('aria-valuenow', battleState.opponentHealth);

        // Display current moves
        $('#playerMove').text(battleState.playerMove);
        $('#opponentMove').text(battleState.opponentMove);

        console.log('Battle UI updated with current state:', battleState);
    }

    // Function to display chat messages in the battle arena
    function displayChatMessage(message) {
        const chatWindow = $('#chatWindow');
        chatWindow.append(`<div>${message}</div>`);
        chatWindow.scrollTop(chatWindow.prop("scrollHeight"));
        console.log('Displaying chat message:', message);
    }

    // Event handler for sending chat messages
    $('#chatForm').submit(function(event) {
        event.preventDefault();
        const message = $('#chatInput').val();
        socket.send(JSON.stringify({ type: 'chatMessage', message: message }));
        $('#chatInput').val(''); // Clear the input after sending
    });

    // Event handlers for player actions like attack and special moves
    $('#attackButton').click(function() {
        executePlayerMove('attack');
    });

    $('#specialMoveButton').click(function() {
        executePlayerMove('special');
    });

    // Function to execute a player move and send it to the server
    function executePlayerMove(move) {
        console.log(`Executing player move: ${move}`);
        socket.send(JSON.stringify({ type: 'playerMove', move: move }));
    }

    // Function to handle incoming battle updates from the server
    function handleBattleUpdate(data) {
        console.log('Received battle update', data);
        // Placeholder for handling battle updates
        // This should update the UI based on the received battle state
        updateBattleUI(data);
    }
});