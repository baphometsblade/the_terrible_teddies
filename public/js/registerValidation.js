document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registerForm');
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const errorElement = document.getElementById('errorMessages'); // INPUT_REQUIRED {Add an element with id="errorMessages" in your HTML to display errors}

    form.addEventListener('submit', function(e) {
        let messages = [];

        if (username.value === '' || username.value == null) {
            messages.push('Username is required');
        }

        if (password.value.length <= 6) {
            messages.push('Password must be longer than 6 characters');
        }

        if (password.value.length >= 20) {
            messages.push('Password must be less than 20 characters');
        }

        if (password.value !== confirmPassword.value) {
            messages.push('Passwords do not match');
        }

        if (messages.length > 0) {
            e.preventDefault();
            errorElement.innerText = messages.join(', ');
        }
    });
});