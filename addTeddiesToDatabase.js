require('dotenv').config();
const mongoose = require('mongoose');
const Teddy = require('./models/Teddy');

const teddiesToAdd = [
  // Mythic Teddies
  {
    "name": "Aetherclaw the Mystic",
    "description": "Wielding cosmic energies with a naughty wink, Aetherclaw knows how to use his powers to enchant and beguile.",
    "attackDamage": 28,
    "health": 90,
    "specialMove": "Celestial Tease",
    "rarity": "Mythic",
    "theme": "Celestial",
    "humorStyle": "Naughty",
    "role": "Enchanter",
    "interactionStyle": "Bewitching",
    "voiceLine": "Let the stars align in delight.",
    "collectibilityFactor": 10
  },
  {
    "name": "Loki Paws",
    "description": "The mischievous trickster bear who loves to play naughty pranks on the gods and mortals alike.",
    "attackDamage": 26,
    "health": 88,
    "specialMove": "Mischief Mirage",
    "rarity": "Mythic",
    "theme": "Deception",
    "humorStyle": "Prankish",
    "role": "Trickster",
    "interactionStyle": "Sly",
    "voiceLine": "Let's turn mischief into pleasure.",
    "collectibilityFactor": 10
  },
  {
    "name": "Valkyrie Vixen",
    "description": "This warrior goddess bear chooses the bravest from the battlefield, offering them a place in her racy realm.",
    "attackDamage": 30,
    "health": 92,
    "specialMove": "Sensual Selection",
    "rarity": "Mythic",
    "theme": "Warrior",
    "humorStyle": "Bold",
    "role": "Chooser of the Slain",
    "interactionStyle": "Daring",
    "voiceLine": "Join me in a valiant venture of vice.",
    "collectibilityFactor": 10
  },
  {
    "name": "Merlyn Mystique",
    "description": "A wizard bear with a penchant for casting spells that leave others in a bewitched state of undress.",
    "attackDamage": 27,
    "health": 85,
    "specialMove": "Enchanted Undressing",
    "rarity": "Mythic",
    "theme": "Wizardry",
    "humorStyle": "Enchanting",
    "role": "Wizard",
    "interactionStyle": "Mysterious",
    "voiceLine": "My magic will leave you spellbound... and undressed.",
    "collectibilityFactor": 9
  },
  {
    "name": "Aphrodite Amour",
    "description": "The goddess of love and beauty, this bear knows the art of seduction and isn't afraid to use it.",
    "attackDamage": 25,
    "health": 90,
    "specialMove": "Love Charm",
    "rarity": "Mythic",
    "theme": "Love",
    "humorStyle": "Seductive",
    "role": "Goddess",
    "interactionStyle": "Alluring",
    "voiceLine": "Surrender to love, or at least to a night of fun.",
    "collectibilityFactor": 10
  },
  {
    "name": "Dionysus Delight",
    "description": "Known for his wild parties, this bear brings the spirit of revelry and risqué fun wherever he goes.",
    "attackDamage": 26,
    "health": 93,
    "specialMove": "Bacchanal Bliss",
    "rarity": "Mythic",
    "theme": "Revelry",
    "humorStyle": "Indulgent",
    "role": "God",
    "interactionStyle": "Exuberant",
    "voiceLine": "Indulge in the divine decadence of delight!",
    "collectibilityFactor": 10
  },
  {
    "name": "Thor Thunder",
    "description": "With a hammer that's not just for battle, Thor knows how to 'nail' his adversaries in more ways than one.",
    "attackDamage": 29,
    "health": 91,
    "specialMove": "Thunderous Seduction",
    "rarity": "Mythic",
    "theme": "Thunder",
    "humorStyle": "Powerful",
    "role": "God",
    "interactionStyle": "Commanding",
    "voiceLine": "Feel the might of my hammer... in more ways than one.",
    "collectibilityFactor": 9
  },
  {
    "name": "Hera's Jealousy",
    "description": "Don't cross this queen of the gods; her vengeance is as fierce as her unbridled passion.",
    "attackDamage": 28,
    "health": 94,
    "specialMove": "Divine Retribution",
    "rarity": "Mythic",
    "theme": "Jealousy",
    "humorStyle": "Vengeful",
    "role": "Queen",
    "interactionStyle": "Possessive",
    "voiceLine": "Cross me, and you'll feel the wrath of a goddess scorned.",
    "collectibilityFactor": 9
  },
  {
    "name": "Poseidon's Trident",
    "description": "Master of the seas and commander of wet and wild adventures, Poseidon's trident isn't just for show.",
    "attackDamage": 30,
    "health": 95,
    "specialMove": "Aquatic Rapture",
    "rarity": "Mythic",
    "theme": "Sea",
    "humorStyle": "Captivating",
    "role": "God",
    "interactionStyle": "Dominant",
    "voiceLine": "Dive deep into the pleasures of the sea... and beyond.",
    "collectibilityFactor": 10
  },
  {
    "name": "Hades' Heat",
    "description": "Ruling the underworld with a firm hand, Hades knows how to heat things up in the darkest of realms.",
    "attackDamage": 27,
    "health": 88,
    "specialMove": "Infernal Desire",
    "rarity": "Mythic",
    "theme": "Underworld",
    "humorStyle": "Intense",
    "role": "God",
    "interactionStyle": "Fiery",
    "voiceLine": "Let's turn up the heat and explore what lies beneath.",
    "collectibilityFactor": 9
  }
  // ... Add the rest of the teddies provided by the user ...
];

mongoose.connect(process.env.DATABASE_URL)
  .then(() => {
    console.log('MongoDB connected successfully');
    addTeddies();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message, err.stack);
  });

async function addTeddies() {
  try {
    for (const teddyData of teddiesToAdd) {
      const existingTeddy = await Teddy.findOne({ name: teddyData.name });
      if (!existingTeddy) {
        const newTeddy = new Teddy(teddyData);
        await newTeddy.save();
        console.log(`Added new teddy: ${newTeddy.name}`);
      } else {
        console.log(`Teddy with name ${teddyData.name} already exists. Updating existing teddy.`);
        await Teddy.findOneAndUpdate({ name: teddyData.name }, teddyData, { new: true, upsert: true });
        console.log(`Updated teddy: ${teddyData.name}`);
      }
    }
    console.log('All teddies have been processed');
  } catch (error) {
    console.error('Error adding teddies:', error.message, error.stack);
  } finally {
    mongoose.connection.close();
  }
}