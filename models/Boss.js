const mongoose = require('mongoose');
const { Schema } = mongoose;

const bossSchema = new Schema({
  name: { type: String, required: true },
  health: { type: Number, required: true },
  attackDamage: { type: Number, required: true },
  specialMove: { type: String, required: true },
  arena: { type: Schema.Types.ObjectId, ref: 'Arena' }
});

const Boss = mongoose.model('Boss', bossSchema);
export default Boss;