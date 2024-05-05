// This file is responsible for managing teddy bear statistics in the Terrible Teddies game.

// Import necessary utility functions
import { calculateAttackDamage, calculateDefensePoints } from './utils/calculationHelpers';
import { fetchTeddyData, updateTeddyStatsUI } from './utils/dataHelpers';

// Function to fetch teddy bear data from the server
async function fetchTeddyStats(teddyId) {
  try {
    const teddyData = await fetchTeddyData(teddyId);
    console.log(`Teddy data fetched successfully for teddyId: ${teddyId}`, teddyData);
    return teddyData;
  } catch (error) {
    console.error('Error fetching teddy stats:', error.message, error.stack);
    throw error; // Rethrow the error after logging
  }
}

// Function to update teddy bear health
function updateTeddyHealth(teddy, newHealth) {
  try {
    teddy.health = newHealth;
    console.log(`Updated health for teddyId: ${teddy.id} to ${newHealth}`);
    updateTeddyStatsUI(teddy.id); // Update the UI with the new health value
  } catch (error) {
    console.error('Error updating teddy health:', error.message, error.stack);
  }
}

// Function to calculate and apply attack damage
function applyAttackDamage(attackerTeddy, defenderTeddy) {
  try {
    const attackDamage = calculateAttackDamage(attackerTeddy.attack, defenderTeddy.defense);
    defenderTeddy.health -= attackDamage; // Subtract damage from defender's health
    console.log(`Applied ${attackDamage} damage from teddyId: ${attackerTeddy.id} to teddyId: ${defenderTeddy.id}`);
    updateTeddyStatsUI(defenderTeddy.id); // Update the UI with the new health value
  } catch (error) {
    console.error('Error applying attack damage:', error.message, error.stack);
  }
}

// Function to calculate and apply defense points
function applyDefensePoints(teddy) {
  try {
    const defensePoints = calculateDefensePoints(teddy.defense);
    teddy.defense += defensePoints; // Add defense points to teddy's defense
    console.log(`Applied ${defensePoints} defense points to teddyId: ${teddy.id}`);
    updateTeddyStatsUI(teddy.id); // Update the UI with the new defense value
  } catch (error) {
    console.error('Error applying defense points:', error.message, error.stack);
  }
}

// Export the functions for use in other parts of the game
export { fetchTeddyStats, updateTeddyHealth, applyAttackDamage, applyDefensePoints };