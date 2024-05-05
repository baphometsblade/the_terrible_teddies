const express = require('express');
const router = express.Router();
const Teddy = require('../models/Teddy');

// Route to get all teddies
router.get('/teddies', async (req, res) => {
  try {
    const teddies = await Teddy.find({});
    console.log('Fetched all teddies successfully');
    res.json(teddies);
  } catch (error) {
    console.error('Error fetching teddies:', error.message);
    console.error(error.stack);
    res.status(500).send('Error fetching teddies');
  }
});

// Route to get a single teddy by id
router.get('/teddies/:id', async (req, res) => {
  try {
    const teddy = await Teddy.findById(req.params.id);
    if (!teddy) {
      console.log(`Teddy with id ${req.params.id} not found`);
      return res.status(404).send('Teddy not found');
    }
    console.log(`Fetched teddy with id ${req.params.id} successfully`);
    res.json(teddy);
  } catch (error) {
    console.error(`Error fetching teddy with id ${req.params.id}:`, error.message);
    console.error(error.stack);
    res.status(500).send('Error fetching teddy');
  }
});

module.exports = router;