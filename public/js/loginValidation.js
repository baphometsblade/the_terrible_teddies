document.addEventListener("DOMContentLoaded", function() {
    const loginForm = document.querySelector("#loginForm");
    const usernameInput = document.querySelector("#username");
    const passwordInput = document.querySelector("#password");
    const errorMessagesDiv = document.querySelector("#errorMessages");

    loginForm.addEventListener("submit", function(event) {
        let validationFailed = false;
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        // Clear previous error messages
        while (errorMessagesDiv.firstChild) {
            errorMessagesDiv.removeChild(errorMessagesDiv.firstChild);
        }

        // Username validation
        if (username.length < 3 || username.length > 20) {
            displayError("Username must be between 3 and 20 characters.");
            validationFailed = true;
        }

        // Password validation for enhanced security
        if (password.length < 8) {
            displayError("Password must be at least 8 characters long.");
            validationFailed = true;
        }

        if (!password.match(/[A-Z]/)) {
            displayError("Password must contain at least one uppercase letter.");
            validationFailed = true;
        }

        if (!password.match(/[a-z]/)) {
            displayError("Password must contain at least one lowercase letter.");
            validationFailed = true;
        }

        if (!password.match(/[0-9]/)) {
            displayError("Password must contain at least one digit.");
            validationFailed = true;
        }

        if (!password.match(/[\!\@\#\$\%\^\&\*\(\)\_\+\-\=\[\]\{\}\;\:\'\"\<\>\,\.\?\/\~\`]/)) {
            displayError("Password must contain at least one special character (e.g., !, @, #).");
            validationFailed = true;
        }

        if (validationFailed) {
            event.preventDefault(); // Prevent form submission
            console.log("Validation failed. Form submission prevented.");
        } else {
            console.log("Validation passed. Form submitted.");
        }
    });

    function displayError(message) {
        const errorMessage = document.createElement("div");
        errorMessage.textContent = message;
        errorMessage.classList.add("error-message");
        errorMessage.style.color = "red";
        errorMessagesDiv.appendChild(errorMessage);
        console.error("Validation error: " + message);
    }
});

console.log("Login validation script loaded.");