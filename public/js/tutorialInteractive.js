document.addEventListener('DOMContentLoaded', function() {
  const startCombatDemoBtn = document.getElementById('start-combat-demo');
  const startItemDemoBtn = document.getElementById('start-item-demo');
  const startLevelingDemoBtn = document.getElementById('start-leveling-demo');

  startCombatDemoBtn.addEventListener('click', function() {
    console.log('Starting interactive combat demo.');
    // Placeholder for combat demo logic
    try {
      // Simulate combat scenario for demonstration
      console.log('Combat demo: Simulating attack...');
      alert('Combat demo: Your teddy attacks the enemy!');
      console.log('Combat demo: Simulating special move...');
      alert('Combat demo: Your teddy uses a special move!');
    } catch (error) {
      console.error('Error in combat demo:', error.message, error.stack);
      alert('Error occurred in combat demo. Please try again later.');
    }
  });

  startItemDemoBtn.addEventListener('click', function() {
    console.log('Starting interactive item demo.');
    // Placeholder for item usage demo logic
    try {
      // Simulate item usage for demonstration
      console.log('Item demo: Simulating item equip...');
      alert('Item demo: You equipped a powerful sword!');
      console.log('Item demo: Simulating item effect...');
      alert('Item demo: Your teddy\'s attack power increased!');
    } catch (error) {
      console.error('Error in item demo:', error.message, error.stack);
      alert('Error occurred in item demo. Please try again later.');
    }
  });

  startLevelingDemoBtn.addEventListener('click', function() {
    console.log('Starting interactive leveling demo.');
    // Placeholder for leveling example logic
    try {
      // Simulate leveling scenario for demonstration
      console.log('Leveling demo: Simulating experience gain...');
      alert('Leveling demo: Your teddy gained experience!');
      console.log('Leveling demo: Simulating level up...');
      alert('Leveling demo: Your teddy leveled up and learned a new move!');
    } catch (error) {
      console.error('Error in leveling demo:', error.message, error.stack);
      alert('Error occurred in leveling demo. Please try again later.');
    }
  });
});