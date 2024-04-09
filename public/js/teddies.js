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
    $('#selectedTeddyIds').val(selectedTeddies.join(','));
  });

  // Submit the selected teddies for battle initiation
  $('#lineup-form').submit(function(event) {
    event.preventDefault();
    var selectedTeddyIds = $('#selectedTeddyIds').val().split(',');
    if (selectedTeddyIds.length !== 2) {
      console.log('Attempted to initiate battle without selecting exactly 2 teddies.');
      alert('Please select exactly 2 teddies to initiate battle.');
      return;
    }
    $.ajax({
      url: '/game/initiate-battle', // Corrected the URL to initiate battle
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ selectedTeddyIds: selectedTeddyIds }), // Corrected the data format to match expected server-side format
      success: function(response) {
        console.log('Battle initiated with teddies:', response);
        // Redirect to the battle arena view
        window.location.href = '/game/battle-arena';
      },
      error: function(xhr, status, error) {
        console.error('Error initiating battle:', error);
        alert('Error initiating battle. Please try again.');
      }
    });
  });
});