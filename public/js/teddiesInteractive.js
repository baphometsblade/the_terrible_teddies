$(document).ready(function() {
    // Initialize the teddies carousel with Adventure Time theme settings
    $('#teddies-collection').slick({
        infinite: true,
        slidesToShow: 3,
        slidesToScroll: 3,
        dots: true, // Added for Adventure Time theme
        arrows: true, // Added for Adventure Time theme
        autoplay: true, // Added for Adventure Time theme
        autoplaySpeed: 2000, // Added for Adventure Time theme
    });

    // Initialize an array to track selected teddy IDs
    let selectedTeddyIds = [];

    // Handle teddy selection for battle with Adventure Time theme enhancements
    $('.teddy-card').click(function() {
        const teddyCard = $(this);
        const teddyId = teddyCard.data('teddy-id');

        if (teddyCard.hasClass('selected')) {
            teddyCard.removeClass('selected');
            selectedTeddyIds = selectedTeddyIds.filter(id => id !== teddyId);
        } else {
            if (selectedTeddyIds.length < 2) {
                teddyCard.addClass('selected');
                selectedTeddyIds.push(teddyId);
            }
        }

        $('#selectedTeddyIds').val(selectedTeddyIds.join(';'));
    });

    // AJAX call to initiate battle with selected teddies with Adventure Time theme enhancements
    $('#lineup-form').submit(function(event) {
        event.preventDefault();

        if (selectedTeddyIds.length < 2) {
            $('#error-message').text('Please select at least two teddies to initiate battle.').show();
            return;
        }

        $.ajax({
            url: '/game/initiate-battle',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ selectedTeddyIds: selectedTeddyIds }),
            success: function(response) {
                console.log('Battle initiated successfully.');
                window.location.href = '/game/battle-arena';
            },
            error: function(xhr, status, error) {
                console.error('Error initiating battle:', error);
                var errorMessage = xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : 'An error occurred while initiating the battle. Please try again.';
                $('#error-message').text(errorMessage).show();
                console.error("Error initiating battle: " + errorMessage + ". Status: " + status + ". Error: " + error); // Log the error details
            }
        });
    });

    // Filter and search functionality for teddies with Adventure Time theme enhancements
    $('#filter-teddies').on('input', function() {
        const filterValue = $(this).val().toLowerCase();
        $('#teddies-collection .teddy-card').filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(filterValue) > -1)
        });
    });

    // Log the completion of the teddiesInteractive.js script setup with Adventure Time theme enhancements
    console.log('Teddy selection and filtering setup complete with Adventure Time enhancements.');
});