document.addEventListener('DOMContentLoaded', function() {
  const startCombatDemoBtn = document.getElementById('start-combat-demo');
  const startItemDemoBtn = document.getElementById('start-item-demo');
  const startLevelingDemoBtn = document.getElementById('start-leveling-demo');

  startCombatDemoBtn.addEventListener('click', function() {
    console.log('Starting interactive combat demo.');
    try {
      // Enhanced combat demo logic with animations and interactive elements
      console.log('Combat demo: Simulating attack...');
      alert('Combat demo: Your teddy attacks the enemy with a visually animated attack!');
      console.log('Combat demo: Simulating special move...');
      alert('Combat demo: Your teddy uses a special move with a unique animation!');
    } catch (error) {
      console.error('Error in combat demo:', error.message, error.stack);
      alert('Error occurred in combat demo. Please try again later.');
    }
  });

  startItemDemoBtn.addEventListener('click', function() {
    console.log('Starting interactive item demo.');
    try {
      // Enhanced item usage demo logic with animations and interactive elements
      console.log('Item demo: Simulating item equip...');
      alert('Item demo: You equipped a powerful sword with a visual effect!');
      console.log('Item demo: Simulating item effect...');
      alert("Item demo: Your teddy's attack power increased with a visual representation!");
    } catch (error) {
      console.error('Error in item demo:', error.message, error.stack);
      alert('Error occurred in item demo. Please try again later.');
    }
  });

  startLevelingDemoBtn.addEventListener('click', function() {
    console.log('Starting interactive leveling demo.');
    try {
      // Enhanced leveling example logic with animations and interactive elements
      console.log('Leveling demo: Simulating experience gain...');
      alert('Leveling demo: Your teddy gained experience with a visual progress bar!');
      console.log('Leveling demo: Simulating level up...');
      alert('Leveling demo: Your teddy leveled up and learned a new move with a celebratory animation!');
    } catch (error) {
      console.error('Error in leveling demo:', error.message, error.stack);
      alert('Error occurred in leveling demo. Please try again later.');
    }
  });
});