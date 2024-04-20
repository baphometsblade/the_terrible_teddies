const express = require('express');
const router = express.Router();
const Teddy = require('../models/Teddy');
const Item = require('../models/Item');
const { body, validationResult } = require('express-validator');

// Middleware for input validation
const validateEquip = [
  body('teddyId').isMongoId().withMessage('Invalid Teddy ID format'),
  body('itemId').isMongoId().withMessage('Invalid Item ID format'),
];

// Middleware for input validation
const validateUnequip = [
  body('teddyId').isMongoId().withMessage('Invalid Teddy ID format'),
  body('itemId').isMongoId().withMessage('Invalid Item ID format'),
];

// Route to equip an item with input validation
router.post('/equip', validateEquip, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { teddyId, itemId } = req.body;
    const item = await Item.findById(itemId);
    if (!item) {
      console.log('Item not found');
      return res.status(404).send('Item not found');
    }
    const teddy = await Teddy.findById(teddyId);
    if (!teddy) {
      console.log('Teddy not found');
      return res.status(404).send('Teddy not found');
    }
    if (teddy.items.includes(itemId)) {
      console.log('Item already equipped to this teddy');
      return res.status(400).send('Item already equipped to this teddy');
    }
    teddy.items.push(itemId);
    await teddy.save();
    console.log('Item equipped successfully');
    res.send('Item equipped successfully');
  } catch (error) {
    console.error('Error equipping item:', error.message, error.stack);
    res.status(500).send(error.message);
  }
});

// Route to unequip an item with input validation
router.post('/unequip', validateUnequip, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { teddyId, itemId } = req.body;
    const teddy = await Teddy.findById(teddyId);
    if (!teddy) {
      console.log('Teddy not found');
      return res.status(404).send('Teddy not found');
    }
    const itemIndex = teddy.items.indexOf(itemId);
    if (itemIndex === -1) {
      console.log('Item not equipped to this teddy');
      return res.status(400).send('Item not equipped to this teddy');
    }
    teddy.items.splice(itemIndex, 1);
    await teddy.save();
    console.log('Item unequipped successfully');
    res.send('Item unequipped successfully');
  } catch (error) {
    console.error('Error unequipping item:', error.message, error.stack);
    res.status(500).send(error.message);
  }
});

module.exports = router;