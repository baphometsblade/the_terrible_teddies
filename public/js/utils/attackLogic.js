// This module handles the attack logic for the Terrible Teddies game

// Function to calculate attack damage
export function calculateAttackDamage(attackerStats, defenderStats) {
  try {
    const baseDamage = attackerStats.attack;
    const defense = defenderStats.defense;
    const damageDealt = baseDamage - defense;

    console.log(`Attack calculated: ${baseDamage} - ${defense} = ${damageDealt}`);

    return damageDealt > 0 ? damageDealt : 0; // Ensure damage is not negative
  } catch (error) {
    console.error("Error calculating attack damage:", error.message);
    console.error(error.stack);
    throw error; // Rethrow error after logging
  }
}

// Function to apply special move effects
export function applySpecialMove(attacker, defender) {
  try {
    // Placeholder for special move logic
    // This should include logic to apply any special move effects based on the attacker's special move
    console.log(`Applying special move from ${attacker.name} to ${defender.name}`);

    // Example of a special move effect
    if (attacker.specialMove === "Double Damage") {
      console.log(`${attacker.name}'s special move: Double Damage activated`);
      return attacker.attack * 2; // Double the attacker's damage
    } else {
      return attacker.attack; // No special move, return normal attack value
    }
  } catch (error) {
    console.error("Error applying special move:", error.message);
    console.error(error.stack);
    throw error; // Rethrow error after logging
  }
}