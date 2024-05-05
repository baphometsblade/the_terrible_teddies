// This module handles the logic for playing sounds associated with teddy interactions

// Function to play sound for a specific teddy
function playTeddySound(teddyId) {
  const soundPath = `/assets/sounds/${teddyId}.wav`; // Path to the teddy sound file, adjusted for web environment
  const audio = new Audio(soundPath);
  audio.play().then(() => {
    console.log(`Sound played successfully for teddy ${teddyId}`);
  }).catch((error) => {
    console.error("Error playing teddy sound:", error.message);
    console.error(error.stack);
  });
}

// Export the playTeddySound function for use in other modules
export { playTeddySound };