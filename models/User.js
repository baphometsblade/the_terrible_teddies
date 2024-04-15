const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

userSchema.pre('save', async function(next) {
  const user = this;
  if (!user.isModified('password')) return next();
  try {
    const hash = await bcrypt.hash(user.password, 10);
    user.password = hash;
    next();
  } catch (err) {
    console.error('Error hashing password:', err.message, err.stack);
    next(err);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    console.error('Error comparing password:', err.message, err.stack);
    throw err;
  }
};

userSchema.statics.findByUsername = async function(username) {
  try {
    return await this.findOne({ username: username });
  } catch (err) {
    console.error('Error finding user by username:', err.message, err.stack);
    throw err;
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;