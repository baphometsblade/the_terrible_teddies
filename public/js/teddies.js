$(document).ready(function() {
  var selectedTeddies = [];

  // Initialize the carousel with Slick and set the active class on the center teddy
  $('#teddies-collection').slick({
    centerMode: true,
    centerPadding: '60px',
    slidesToShow: 3,
    focusOnSelect: true
  }).on('afterChange', function(event, slick, currentSlide) {
    $('.teddy-card').removeClass('active-teddy');
    var currentTeddy = $('.slick-center').find('.teddy-card');
    currentTeddy.addClass('active-teddy');
  });

  // Update the teddy selection logic to toggle the 'selected' class and update the array of selected teddies
  $('.teddy-card').on('click', '.select-teddy', function() {
    var teddyId = $(this).closest('.teddy-card').data('teddy-id');
    var teddyCard = $(this).closest('.teddy-card');
    if (selectedTeddies.includes(teddyId)) {
      selectedTeddies = selectedTeddies.filter(id => id !== teddyId);
      teddyCard.removeClass('selected');
      console.log('Teddy deselected:', teddyId);
    } else {
      if (selectedTeddies.length < 2) { // Limit the number of selectable teddies to 2
        selectedTeddies.push(teddyId);
        teddyCard.addClass('selected');
        console.log('Teddy selected:', teddyId);
      } else {
        console.log('Cannot select more than 2 teddies.');
        alert('You can only select 2 teddies for the battle.');
      }
    }
    // Update the hidden input field with the selected teddy IDs
    $('#selectedTeddyIds').val(JSON.stringify(selectedTeddies));
  });

  // Submit the selected teddies for battle initiation
  $('#lineup-form').submit(function(event) {
    event.preventDefault();
    var selectedTeddyIds = $('#selectedTeddyIds').val();

    if (!selectedTeddyIds) {
      console.error('No teddy IDs provided for battle initiation');
      alert('Please select exactly 2 teddies to initiate a battle.');
      return false;
    }

    try {
      selectedTeddyIds = JSON.parse(selectedTeddyIds);
    } catch (error) {
      console.error('Error parsing selected teddy IDs:', error.message, error.stack);
      alert('Invalid teddy selection. Please try again.');
      return false;
    }

    if (!Array.isArray(selectedTeddyIds) || selectedTeddyIds.length !== 2) {
      console.error('Invalid teddy lineup for battle initiation');
      alert('Please select exactly 2 teddies to initiate a battle.');
      return false;
    }

    // Proceed with the AJAX request only if two teddies are selected
    $.ajax({
      type: 'POST',
      url: '/game/initiate-battle',
      contentType: 'application/json',
      data: JSON.stringify({ selectedTeddyIds: selectedTeddyIds }),
      success: function(response) {
        // Handle success
        console.log('Battle initiated successfully:', response);
        window.location.href = '/game/battle-arena';
      },
      error: function(xhr, status, error) {
        // Handle error
        console.error('Error initiating battle:', xhr.responseText, status, error);
        alert('Error initiating battle. Please try again.');
      }
    });
  });
});