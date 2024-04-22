const express = require('express');
const router = express.Router();
const MarketItem = require('../models/MarketItem');

// Route to get all available market items
router.get('/market', async (req, res, next) => {
  try {
    const items = await MarketItem.find({ status: 'available' }).populate('teddy');
    console.log('Market items fetched successfully.');
    res.render('marketplace', { items });
  } catch (error) {
    console.error('Market operation failed:', error.message, error.stack);
    next(error);
  }
});

// Route to post an item for sale
router.post('/market/sell', async (req, res, next) => {
  const { teddyId, price } = req.body;
  try {
    const newItem = new MarketItem({ owner: req.session.userId, teddy: teddyId, price });
    await newItem.save();
    console.log('New item listed for sale successfully.');
    res.redirect('/market');
  } catch (error) {
    console.error('Market operation failed:', error.message, error.stack);
    next(error);
  }
});

// Route to buy an item
router.post('/market/buy/:itemId', async (req, res, next) => {
  try {
    const item = await MarketItem.findById(req.params.itemId);
    if (item.status !== 'available') {
      console.log('Item is not available');
      res.status(400).send('Item is not available');
      return;
    }
    item.status = 'sold';
    await item.save();
    console.log(`Item ${item._id} purchased successfully.`);
    res.redirect('/market');
  } catch (error) {
    console.error('Market operation failed:', error.message, error.stack);
    next(error);
  }
});

module.exports = router;