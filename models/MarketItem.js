const mongoose = require('mongoose');

const marketItemSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teddy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teddy', required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['available', 'pending', 'sold'], default: 'available' }
}, { timestamps: true });

const MarketItem = mongoose.model('MarketItem', marketItemSchema);
module.exports = MarketItem;