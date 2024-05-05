// Utility functions for calculations related to the Terrible Teddies game

/**
 * Calculates the attack damage of a teddy based on its stats and any modifiers.
 * @param {number} baseDamage - The base damage of the teddy.
 * @param {number} modifier - Any additional modifiers that affect the damage.
 * @returns {number} The total attack damage.
 */
function calculateAttackDamage(baseDamage, modifier = 0) {
  const totalDamage = baseDamage + modifier;
  console.log(`Calculated attack damage: ${totalDamage}`);
  return totalDamage;
}

/**
 * Calculates the health of a teddy after taking damage.
 * @param {number} currentHealth - The current health of the teddy.
 * @param {number} damageTaken - The amount of damage taken.
 * @returns {number} The new health value.
 */
function calculateHealthAfterDamage(currentHealth, damageTaken) {
  const newHealth = currentHealth - damageTaken;
  console.log(`Calculated new health after taking damage: ${newHealth}`);
  return newHealth;
}

/**
 * Applies a special move effect to the attack damage.
 * @param {number} attackDamage - The original attack damage.
 * @param {number} effectModifier - The modifier from the special move.
 * @returns {number} The modified attack damage.
 */
function applySpecialMoveEffect(attackDamage, effectModifier) {
  const modifiedDamage = attackDamage * effectModifier;
  console.log(`Applied special move effect. New attack damage: ${modifiedDamage}`);
  return modifiedDamage;
}

/**
 * Calculates the defense points of a teddy, reducing incoming damage.
 * @param {number} baseDefense - The base defense points of the teddy.
 * @param {number} incomingDamage - The incoming damage to be reduced.
 * @returns {number} The damage after applying defense.
 */
function calculateDamageAfterDefense(baseDefense, incomingDamage) {
  const damageAfterDefense = Math.max(incomingDamage - baseDefense, 0);
  console.log(`Calculated damage after applying defense: ${damageAfterDefense}`);
  return damageAfterDefense;
}

module.exports = {
  calculateAttackDamage,
  calculateHealthAfterDamage,
  applySpecialMoveEffect,
  calculateDamageAfterDefense,
};