const mongoose = require('mongoose');

const marketItemSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teddy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teddy', required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['available', 'pending', 'sold'], default: 'available' }
}, { timestamps: true });

// At most one available listing per teddy. routes/marketRoutes.js checks before
// it lists, but five requests at once all passed that check and listed the same
// teddy five times. Sold listings are outside the index, so a teddy can be
// listed again after a sale.
marketItemSchema.index({ teddy: 1 }, { unique: true, partialFilterExpression: { status: 'available' } });

const MarketItem = mongoose.model('MarketItem', marketItemSchema);
module.exports = MarketItem;