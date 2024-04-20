const mongoose = require('mongoose');
const Teddy = require('../../models/Teddy');
const Item = require('../../models/Item');
const logger = require('../../utils/logger');

// Function to equip an item to a teddy
const equipItemToTeddy = async (teddyId, itemId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(teddyId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      throw new Error('Invalid Teddy ID or Item ID');
    }

    const teddy = await Teddy.findById(teddyId);
    if (!teddy) {
      throw new Error('Teddy not found');
    }

    const item = await Item.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    // Check if the item is already equipped
    if (teddy.items.includes(itemId)) {
      logger.info(`Item ${itemId} is already equipped to Teddy ${teddyId}`);
      return;
    }

    teddy.items.push(itemId);
    await teddy.save();
    logger.info(`Item ${itemId} successfully equipped to Teddy ${teddyId}`);
  } catch (error) {
    logger.error(`Error equipping item to teddy: ${error.message}`, error.stack);
  }
};

// Function to unequip an item from a teddy
const unequipItemFromTeddy = async (teddyId, itemId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(teddyId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      throw new Error('Invalid Teddy ID or Item ID');
    }

    const teddy = await Teddy.findById(teddyId);
    if (!teddy) {
      throw new Error('Teddy not found');
    }

    const itemIndex = teddy.items.indexOf(itemId);
    if (itemIndex === -1) {
      logger.info(`Item ${itemId} is not equipped to Teddy ${teddyId}`);
      return;
    }

    teddy.items.splice(itemIndex, 1);
    await teddy.save();
    logger.info(`Item ${itemId} successfully unequipped from Teddy ${teddyId}`);
  } catch (error) {
    logger.error(`Error unequipping item from teddy: ${error.message}`, error.stack);
  }
};

module.exports = {
  equipItemToTeddy,
  unequipItemFromTeddy,
};