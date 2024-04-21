const express = require('express');
const router = express.Router();
const MarketItem = require('../models/MarketItem');
const { isAuthenticated } = require('./middleware/authMiddleware');

// Route to get all available market items
router.get('/market', isAuthenticated, async (req, res) => {
  try {
    const items = await MarketItem.find({ status: 'available' }).populate('teddy');
    res.render('marketplace', { items });
  } catch (error) {
    console.error('Failed to fetch market items:', error.message, error.stack);
    res.status(500).send('Error fetching market items');
  }
});

// Route to post an item for sale
router.post('/market/sell', isAuthenticated, async (req, res) => {
  const { teddyId, price } = req.body;
  try {
    const newItem = new MarketItem({ owner: req.session.userId, teddy: teddyId, price });
    await newItem.save();
    res.redirect('/market');
  } catch (error) {
    console.error('Failed to list item for sale:', error.message, error.stack);
    res.status(500).send('Error listing item for sale');
  }
});

// Route to buy an item
router.post('/market/buy/:itemId', isAuthenticated, async (req, res) => {
  try {
    const item = await MarketItem.findById(req.params.itemId);
    if (item.status !== 'available') {
      console.log('Item is not available');
      return res.status(400).send('Item is not available');
    }
    item.status = 'sold';
    await item.save();
    res.redirect('/market');
  } catch (error) {
    console.error('Failed to purchase item:', error.message, error.stack);
    res.status(500).send('Error purchasing item');
  }
});

module.exports = router;