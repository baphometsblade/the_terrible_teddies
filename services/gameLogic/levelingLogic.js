class LevelingLogic {
  constructor(playerModel, teddyModel) {
    this.playerModel = playerModel;
    this.teddyModel = teddyModel;
  }

  async levelUpTeddy(teddyId) {
    try {
      const teddy = await this.teddyModel.findById(teddyId);
      if (!teddy) {
        console.log(`Teddy with ID ${teddyId} not found.`);
        return;
      }

      teddy.level += 1;
      teddy.health += 10; // Increase health by 10 with each level up
      teddy.attackDamage += 5; // Increase attack damage by 5 with each level up

      await teddy.save();
      console.log(`Teddy ${teddy.name} leveled up to level ${teddy.level}.`);
    } catch (error) {
      console.error('Error leveling up teddy:', error.message, error.stack);
    }
  }

  async addExperience(playerId, experiencePoints) {
    try {
      const player = await this.playerModel.findById(playerId);
      if (!player) {
        console.log(`Player with ID ${playerId} not found.`);
        return;
      }

      player.experiencePoints += experiencePoints;

      // Check if experience points exceed the threshold for leveling up
      if (player.experiencePoints >= this.calculateExperienceThreshold(player.level)) {
        player.level += 1;
        player.experiencePoints = 0; // Reset experience points after leveling up
        console.log(`Player ${player.username} leveled up to level ${player.level}.`);
      }

      await player.save();
    } catch (error) {
      console.error('Error adding experience to player:', error.message, error.stack);
    }
  }

  calculateExperienceThreshold(level) {
    // Simple formula for calculating experience threshold for next level
    return level * 100; // Each level requires 100 more experience points than the last
  }
}

module.exports = LevelingLogic;