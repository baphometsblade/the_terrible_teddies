// This module handles the defense logic for teddies in the game

// Function to calculate defense points based on teddy's attributes and items
function calculateDefensePoints(teddyAttributes, teddyItems) {
  let defensePoints = teddyAttributes.baseDefense;
  teddyItems.forEach(item => {
    if (item.type === 'defense') {
      defensePoints += item.effect;
    }
  });
  console.log(`Defense points calculated: ${defensePoints}`);
  return defensePoints;
}

// Function to apply defense during battle, reducing incoming damage
function applyDefense(incomingDamage, defensePoints) {
  let damageAfterDefense = incomingDamage - defensePoints;
  if (damageAfterDefense < 0) {
    damageAfterDefense = 0;
  }
  console.log(`Incoming damage: ${incomingDamage}, Damage after defense: ${damageAfterDefense}`);
  return damageAfterDefense;
}

// Exporting defense logic functions for use in other parts of the application
export {
  calculateDefensePoints,
  applyDefense
};