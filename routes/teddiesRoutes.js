const express = require('express');
const router = express.Router();
const Teddy = require('../models/Teddy');

// GET request for the teddies collection
router.get('/', async (req, res) => {
  try {
    const teddies = await Teddy.find({});
    console.log('Fetching all teddies from the database.');
    res.render('teddies', { teddies: teddies });
  } catch (err) {
    console.error('Error fetching teddies from the database:', err.message, err.stack);
    res.status(500).send('Error fetching teddies from the database.');
  }
});

module.exports = router;