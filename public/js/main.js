// This script is responsible for client-side interactions in the Terrible Teddies game.

document.addEventListener('DOMContentLoaded', function() {
    console.log('Document loaded. Initializing UI components...');

    // Event listeners for UI interactions can be added here.
    // For example, handling clicks on teddy bear cards to display their stats or initiate a battle.

    // Handling form submission for the login page
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            let validationFailed = false;

            if (!username) {
                document.getElementById('usernameError').textContent = 'Username is required';
                validationFailed = true;
            } else {
                document.getElementById('usernameError').textContent = '';
            }

            if (!password) {
                document.getElementById('passwordError').textContent = 'Password is required';
                validationFailed = true;
            } else {
                document.getElementById('passwordError').textContent = '';
            }

            if (validationFailed) {
                event.preventDefault(); // Prevent form submission
                console.error('Validation failed. Please fill in all required fields.');
            }
        });
    }

    // Error handling for login feedback
    const urlParams = new URLSearchParams(window.location.search);
    const loginError = urlParams.get('error');
    if (loginError) {
        const container = document.querySelector('.container');
        const errorMessage = document.createElement('p');
        errorMessage.style.color = 'red';
        errorMessage.textContent = 'Error: ' + loginError;
        container.insertBefore(errorMessage, container.firstChild);
        console.error('Login error:', loginError);
    }

    console.log('UI components initialized.');
});

// Error handling for failed network requests or interactions
window.addEventListener('error', function(event) {
    console.error('An error occurred:', event.message);
    console.error(event.error.stack);
});