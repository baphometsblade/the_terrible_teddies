const express = require('express');
const router = express.Router();
const MarketItem = require('../../models/MarketItem');
const authMiddleware = require('../middleware/authMiddleware');

// Route to get all available market items
router.get('/market', authMiddleware.ensureAuthenticated, (req, res) => {
    MarketItem.find({ status: 'available' })
        .then(items => {
            console.log('Retrieved market items successfully');
            res.json(items);
        })
        .catch(err => {
            console.error('Error retrieving market items:', err.message, err.stack);
            res.status(500).send('Failed to retrieve market items.');
        });
});

// Route to post an item for sale
router.post('/market/sell', authMiddleware.ensureAuthenticated, (req, res) => {
    const { teddyId, price } = req.body;
    const newMarketItem = new MarketItem({
        owner: req.user._id,
        teddy: teddyId,
        price: price,
        status: 'available'
    });

    newMarketItem.save()
        .then(item => {
            console.log('Item posted for sale successfully:', item);
            res.status(201).send('Item posted for sale successfully.');
        })
        .catch(err => {
            console.error('Error posting item for sale:', err.message, err.stack);
            res.status(500).send('Failed to post item for sale.');
        });
});

// Route to buy an item
router.post('/market/buy', authMiddleware.ensureAuthenticated, (req, res) => {
    const { itemId } = req.body;

    MarketItem.findById(itemId)
        .then(item => {
            if (!item || item.status !== 'available') {
                console.log('Item not available for purchase');
                return res.status(404).send('Item not available for purchase.');
            }

            if (item.owner.equals(req.user._id)) {
                console.log('Cannot buy your own item');
                return res.status(400).send('Cannot buy your own item.');
            }

            item.status = 'sold';
            item.save()
                .then(() => {
                    console.log('Item purchased successfully:', item);
                    res.send('Item purchased successfully.');
                })
                .catch(err => {
                    console.error('Error updating item status:', err.message, err.stack);
                    res.status(500).send('Failed to update item status.');
                });
        })
        .catch(err => {
            console.error('Error finding item:', err.message, err.stack);
            res.status(500).send('Failed to find item.');
        });
});

module.exports = router;