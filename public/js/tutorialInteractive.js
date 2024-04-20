document.addEventListener('DOMContentLoaded', function() {
  console.log('Interactive tutorial script loaded.');

  // Event listeners for interactive tutorial elements
  document.querySelectorAll('.interactive-demo').forEach(button => {
    button.addEventListener('click', function() {
      const demoType = this.getAttribute('data-demo-type');
      console.log(`Interactive demo for ${demoType} started.`);
      switch (demoType) {
        case 'combat':
          console.log('Starting combat demo.');
          // Simulate combat interaction
          document.getElementById('combat-demo').style.display = 'block';
          document.getElementById('item-demo').style.display = 'none';
          document.getElementById('leveling-demo').style.display = 'none';
          alert('Combat demo: This interactive demo will guide you through the basics of combat mechanics.');
          break;
        case 'item':
          console.log('Starting item demo.');
          // Simulate item usage interaction
          document.getElementById('combat-demo').style.display = 'none';
          document.getElementById('item-demo').style.display = 'block';
          document.getElementById('leveling-demo').style.display = 'none';
          alert('Item demo: This interactive demo will show you how to equip and use items effectively.');
          break;
        case 'leveling':
          console.log('Starting leveling demo.');
          // Simulate leveling interaction
          document.getElementById('combat-demo').style.display = 'none';
          document.getElementById('item-demo').style.display = 'none';
          document.getElementById('leveling-demo').style.display = 'block';
          alert('Leveling demo: This interactive demo will explain how experience points work and how to level up your teddies.');
          break;
        default:
          console.error('Unknown demo type:', demoType);
          alert('Error: Unknown demo type. Please try again.');
      }
    });
  });

  document.getElementById('start-combat-demo').addEventListener('click', function() {
    console.log('Combat demo initiated.');
    // Simulate a combat scenario with basic animations or interactions
    alert('Combat Demo: Simulating a basic combat scenario. Imagine teddies fighting!');
    // Placeholder for combat demo logic
  });

  document.getElementById('start-item-demo').addEventListener('click', function() {
    console.log('Item usage demo initiated.');
    // Simulate using an item with basic animations or interactions
    alert('Item Demo: Demonstrating how to use an item. Imagine a teddy using a health potion!');
    // Placeholder for item usage demo logic
  });

  document.getElementById('start-leveling-demo').addEventListener('click', function() {
    console.log('Leveling demo initiated.');
    // Simulate leveling up a teddy with basic animations or interactions
    alert('Leveling Demo: Showing the leveling process. Imagine a teddy gaining experience and leveling up!');
    // Placeholder for leveling demo logic
  });
});