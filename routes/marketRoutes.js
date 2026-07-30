const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const MarketItem = require('../models/MarketItem');
const Teddy = require('../models/Teddy');
const { isAuthenticated } = require('./middleware/authMiddleware');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Browsing the market stays public.
router.get('/market', async (req, res, next) => {
  try {
    const items = await MarketItem.find({ status: 'available' }).populate('teddy');
    res.render('marketplace', { items, user: req.session.user });
  } catch (error) {
    console.error('Market operation failed:', error.message, error.stack);
    next(error);
  }
});

// Listing an item requires a login. Previously anonymous callers could create
// listings with owner: undefined.
router.post('/market/sell', isAuthenticated, async (req, res, next) => {
  const { teddyId } = req.body;
  const price = Number(req.body.price);

  if (!isValidId(teddyId)) {
    return res.status(400).send('A valid teddyId is required');
  }
  if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) {
    return res.status(400).send('Price must be a positive number');
  }

  try {
    const teddy = await Teddy.findById(teddyId);
    if (!teddy) {
      return res.status(404).send('Teddy not found');
    }
    if (teddy.owner && String(teddy.owner) !== String(req.session.userId)) {
      return res.status(403).send('You cannot sell a teddy you do not own');
    }

    const existing = await MarketItem.findOne({ teddy: teddyId, status: 'available' });
    if (existing) {
      return res.status(409).send('That teddy is already listed');
    }

    await MarketItem.create({ owner: req.session.userId, teddy: teddyId, price });
    res.redirect('/market');
  } catch (error) {
    console.error('Market operation failed:', error.message, error.stack);
    next(error);
  }
});

// Buying requires a login and is now a single atomic transition.
//
// The previous version read the item, checked status, then saved - two buyers
// hitting it simultaneously both passed the check and both "bought" it. It also
// never recorded who bought it, never transferred the teddy, and threw a
// TypeError (500) instead of 404 when the item did not exist.
router.post('/market/buy/:itemId', isAuthenticated, async (req, res, next) => {
  const { itemId } = req.params;

  if (!isValidId(itemId)) {
    return res.status(400).send('Invalid item id');
  }

  try {
    const item = await MarketItem.findById(itemId);
    if (!item) {
      return res.status(404).send('Item not found');
    }
    if (String(item.owner) === String(req.session.userId)) {
      return res.status(400).send('You cannot buy your own listing');
    }

    // Atomic: only the request that flips available -> sold wins the race.
    const claimed = await MarketItem.findOneAndUpdate(
      { _id: itemId, status: 'available' },
      { $set: { status: 'sold' } },
      { new: true }
    );

    if (!claimed) {
      return res.status(409).send('Item is no longer available');
    }

    // Transfer the teddy to the buyer so the sale actually means something.
    await Teddy.findByIdAndUpdate(claimed.teddy, { $set: { owner: req.session.userId } });

    console.log(`Item ${claimed._id} purchased by ${req.session.userId}`);
    res.redirect('/market');
  } catch (error) {
    console.error('Market operation failed:', error.message, error.stack);
    next(error);
  }
});

module.exports = router;
