$(document).ready(function () {
  $('.apply-customization').click(function () {
    const teddyId = $(this).closest('.teddy-customization').data('teddy-id');
    const skinId = $(this).siblings('.skin-selector').val();
    const accessoryId = $(this).siblings('.accessory-selector').val();

    $.ajax({
      url: '/api/teddies/customize',
      method: 'POST',
      data: {
        teddyId: teddyId,
        skinId: skinId,
        accessoryId: accessoryId
      },
      success: function (response) {
        console.log('Customization applied successfully!'); // Logging success
        alert('Customization applied successfully!');
      },
      error: function (error) {
        console.error('Failed to apply customization:', error); // Logging the error with trace
        alert('Failed to apply customization.');
      }
    });
  });
});
