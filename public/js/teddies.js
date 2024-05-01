$(document).ready(function () {
  var selectedTeddies = [];

  // Update the teddy selection logic to toggle the 'selected' class and update the array of selected teddies
  $('.select-teddy').click(function () {
    var teddyId = $(this).data('teddy-id');
    if (selectedTeddies.includes(teddyId)) {
      selectedTeddies = selectedTeddies.filter((id) => id !== teddyId);
      $(this).removeClass('btn-secondary').addClass('btn-primary');
      console.log('Teddy deselected:', teddyId);
    } else {
      if (selectedTeddies.length < 2) {
        // Limit the number of selectable teddies to 2
        selectedTeddies.push(teddyId);
        $(this).removeClass('btn-primary').addClass('btn-secondary');
        console.log('Teddy selected:', teddyId);
      } else {
        console.log('Cannot select more than 2 teddies.');
        alert('You can only select 2 teddies for the battle.');
      }
    }
  });

  // Submit the selected teddies for battle initiation
  $('#lineup-form').submit(function (event) {
    event.preventDefault();
    if (selectedTeddies.length < 2) {
      console.log('Attempted to initiate battle without selecting 2 teddies.');
      alert('Please select 2 teddies to initiate battle.');
      return;
    }
    $.ajax({
      url: '/game/choose-lineup',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ lineup: selectedTeddies }),
      success: function (response) {
        console.log('Battle initiated with lineup:', response);
        window.location.href = '/game/battle'; // Redirect to the battle page
      },
      error: function (xhr, status, error) {
        console.error('Error initiating battle:', error);
        alert('Error initiating battle. Please try again.');
      }
    });
  });
});
