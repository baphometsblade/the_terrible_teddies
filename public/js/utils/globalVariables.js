// Global variables shared across the Terrible Teddies game
const globalVariables = {
  selectedTeddyIds: [], // Array to keep track of selected teddies for battle
  userSessionId: null, // To store the current user's session ID
  battleState: {
    currentTurn: 0,
    totalTurns: 0,
    playerHealth: 100,
    opponentHealth: 100
  }, // Object to manage the state of the current battle
  animationSettings: {
    animationDuration: 500, // Duration of animations in milliseconds
    animationEasing: 'linear' // Easing type for animations
  }, // Object to configure animation settings
  soundSettings: {
    enableSounds: true, // Flag to enable or disable sound effects
    volume: 0.5 // Volume for sound effects, range 0 to 1
  } // Object to configure sound settings
};

// Log the initialization of global variables
console.log("Global variables for Terrible Teddies initialized:", globalVariables);

export default globalVariables;