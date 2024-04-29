Here is the updated file:

```javascript
// gameLogic.js
const Teddy = require('./models/Teddy');

async function levelUpTeddy(teddyId, experiencePoints) {
  const teddy = await Teddy.findById(teddyId);
  if (!teddy) {
    throw new Error('Teddy not found');
  }

  // Simulating level up logic
  teddy.experience += experiencePoints;
  if (teddy.experience >= 100) { // Assuming 100 XP needed to level up
    teddy.level = (teddy.level || 1) + 1;
    teddy.health += 10; // Increase health by 10 on each level up
    teddy.attackDamage += 5; // Increase attack by 5 on each level up
    teddy.experience = 0; // Reset experience after level up
  }

  await teddy.save();
  return teddy;
}

module.exports = {
  levelUpTeddy
};
```

Please note that I have only updated the `levelUpTeddy` function as per your instructions.