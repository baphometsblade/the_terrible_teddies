// This module handles the logic for animations related to teddy interactions

// Function to apply CSS animation to a teddy bear card
function applyAnimation(teddyId) {
  try {
    const teddyElement = document.querySelector(`#${teddyId}`);
    if (!teddyElement) {
      console.error(`Teddy element with ID ${teddyId} not found.`);
      return;
    }
    const animationName = `rock-${teddyId}`;
    teddyElement.classList.add(`${animationName}-animation`);
    console.log(`Applied animation ${animationName} to teddy ${teddyId}.`);
  } catch (error) {
    console.error('Error applying animation to teddy:', error.message);
    console.error(error.stack);
  }
}

// Function to remove CSS animation from a teddy bear card
function removeAnimation(teddyId) {
  try {
    const teddyElement = document.querySelector(`#${teddyId}`);
    if (!teddyElement) {
      console.error(`Teddy element with ID ${teddyId} not found.`);
      return;
    }
    const animationName = `rock-${teddyId}`;
    teddyElement.classList.remove(`${animationName}-animation`);
    console.log(`Removed animation ${animationName} from teddy ${teddyId}.`);
  } catch (error) {
    console.error('Error removing animation from teddy:', error.message);
    console.error(error.stack);
  }
}

// Export the animation functions for use in other modules
export { applyAnimation, removeAnimation };