const mongoose = require('mongoose');

const arenaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  difficulty: { type: Number, required: true },
  environment: { type: String, required: true },
  isEndGame: { type: Boolean, default: true }
});

const Arena = mongoose.model('Arena', arenaSchema);

export default Arena;