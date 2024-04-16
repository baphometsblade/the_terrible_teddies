$(document).ready(function() {
    // Initialize the teddies carousel
    $('#teddies-collection').slick({
        infinite: true,
        slidesToShow: 3,
        slidesToScroll: 3
    });

    // Handle teddy selection for battle
    $('.select-teddy').click(function() {
        const teddyCard = $(this).closest('.teddy-card');
        const teddyId = teddyCard.data('teddy-id');
        let selectedTeddyIds = $('#selectedTeddyIds').val();

        if (teddyCard.hasClass('selected')) {
            teddyCard.removeClass('selected');
            selectedTeddyIds = selectedTeddyIds.replace(`${teddyId};`, '');
        } else {
            teddyCard.addClass('selected');
            selectedTeddyIds += `${teddyId};`;
        }

        $('#selectedTeddyIds').val(selectedTeddyIds);
    });

    // AJAX call to initiate battle with selected teddies
    $('#lineup-form').submit(function(event) {
        event.preventDefault();
        const selectedTeddyIds = $('#selectedTeddyIds').val().split(';').filter(Boolean);

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

    // Filter and search functionality for teddies
    $('#filter-teddies').on('input', function() {
        const filterValue = $(this).val().toLowerCase();
        $('#teddies-collection .teddy-card').filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(filterValue) > -1)
        });
    });

    // Log the completion of the teddiesInteractive.js script setup
    console.log('Teddy selection and filtering setup complete.');
});