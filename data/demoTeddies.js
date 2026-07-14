const DEMO_TEDDIES = [
  {
    _id: 'grumblefluff',
    name: 'Captain Grumblefluff',
    description: 'A cranky front-line bruiser who turns bad moods into bonus damage.',
    attackDamage: 18,
    health: 120,
    specialMove: 'Sulky Slam',
    rarity: 'Common',
    theme: 'Bruiser',
    humorStyle: 'Dry sarcasm',
    role: 'Tank',
    interactionStyle: 'Grumpy but loyal',
    voiceLine: 'I was cuddly before the bills arrived.',
    collectibilityFactor: 12,
    strategyLevel: 42,
    friendliness: 38,
    adaptability: 55,
    experience: 0,
    level: 1,
    imageUrl: ''
  },
  {
    _id: 'sir-stuffs-a-lot',
    name: 'Sir Stuffs-a-Lot',
    description: 'A smug noble teddy who buffs himself whenever the opponent misses.',
    attackDamage: 15,
    health: 105,
    specialMove: 'Royal Tantrum',
    rarity: 'Rare',
    theme: 'Noble',
    humorStyle: 'Ridiculous arrogance',
    role: 'Duelist',
    interactionStyle: 'Bossy show-off',
    voiceLine: 'Bow before the bear with premium stuffing.',
    collectibilityFactor: 36,
    strategyLevel: 63,
    friendliness: 44,
    adaptability: 62,
    experience: 0,
    level: 1,
    imageUrl: ''
  },
  {
    _id: 'penny-patches',
    name: 'Penny Patches',
    description: 'A budget wizard teddy who wins by recycling scraps into shields.',
    attackDamage: 12,
    health: 132,
    specialMove: 'Patch Job Barrier',
    rarity: 'Uncommon',
    theme: 'Scrap mage',
    humorStyle: 'Chaotic optimism',
    role: 'Support',
    interactionStyle: 'Helpful menace',
    voiceLine: 'It is not broken. It is aggressively handmade.',
    collectibilityFactor: 24,
    strategyLevel: 70,
    friendliness: 76,
    adaptability: 81,
    experience: 0,
    level: 1,
    imageUrl: ''
  },
  {
    _id: 'lord-lint',
    name: 'Lord Lint',
    description: 'A legendary nuisance who weakens enemies with pocket-fluff curses.',
    attackDamage: 22,
    health: 98,
    specialMove: 'Lint Storm',
    rarity: 'Legendary',
    theme: 'Cursed laundry',
    humorStyle: 'Absurd villainy',
    role: 'Glass cannon',
    interactionStyle: 'Overdramatic pest',
    voiceLine: 'You dare challenge the king of crumbs?',
    collectibilityFactor: 88,
    strategyLevel: 86,
    friendliness: 21,
    adaptability: 74,
    experience: 0,
    level: 1,
    imageUrl: ''
  }
];

function getDemoTeddyById(id) {
  return DEMO_TEDDIES.find((teddy) => teddy._id === id) || null;
}

module.exports = {
  DEMO_TEDDIES,
  getDemoTeddyById
};
