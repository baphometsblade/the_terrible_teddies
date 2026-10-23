const mongoose = require('mongoose');

// One document for each finished battle that has paid out experience.
//
// The id is the battle's own random id. Battle state lives in the session, so
// the final turn submitted twice at once was played by two requests that had
// both read the unfinished battle, and both paid out. Now the first payout
// writes this document and a second one fails on its unique _id instead of
// paying again. A replay is only possible while the battle is fresh, so MongoDB
// deletes these a day later.
const battleAwardSchema = new mongoose.Schema({
  _id: { type: String },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 }
});

module.exports = mongoose.model('BattleAward', battleAwardSchema);
