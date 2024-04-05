$(document).ready(function() {
  var selectedTeddies = [];

  $('.select-teddy').click(function() {
    var teddyId = $(this).data('teddy-id');
    if (selectedTeddies.includes(teddyId)) {
      selectedTeddies = selectedTeddies.filter(id => id !== teddyId);
      $(this).removeClass('btn-secondary').addClass('btn-primary');
    } else {
      selectedTeddies.push(teddyId);
      $(this).removeClass('btn-primary').addClass('btn-secondary');
    }
  });

  $('#lineup-form').submit(function(event) {
    event.preventDefault();
    if (selectedTeddies.length === 0) {
      alert('Please select at least one teddy.');
      return;
    }
    $.ajax({
      url: '/game/choose-lineup',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ lineup: selectedTeddies }),
      success: function(response) {
        // Redirect to battle initiation or update the UI accordingly
        console.log('Battle initiated with lineup:', response);
        // Implement the correct redirection or UI update logic after the lineup is successfully chosen
        // For example, redirect to the dashboard or update the UI to show the chosen lineup
        window.location.href = '/dashboard'; // Redirect to the dashboard page
      },
      error: function(xhr, status, error) {
        console.error('Error initiating battle:', error);
        alert('Error initiating battle. Please try again.');
      }
    });
  });
});