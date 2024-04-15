require('dotenv').config();
const mongoose = require('mongoose');
const Teddy = require('./models/Teddy');

const teddiesToAdd = [
  [
    {
        "name": "Architect Armand",
        "description": "Architect Armand, a teddy bear who builds dreams and constructs moments of intimacy, designs spaces for love to flourish, making every blueprint a plan for passion.",
        "attackDamage": 23,
        "health": 89,
        "specialMove": "Blueprint of Bliss",
        "rarity": "Rare",
        "theme": "Construction",
        "humorStyle": "Creative",
        "role": "Architect",
        "interactionStyle": "Innovative",
        "voiceLine": "Let's construct a foundation for our passions.",
        "collectibilityFactor": 8
    },
    {
        "name": "Teacher Teachwell",
        "description": "Teacher Teachwell is a teddy bear who educates minds and entices hearts. He turns lessons into sessions of seduction with his plush wisdom and engaging teaching style.",
        "attackDamage": 22,
        "health": 90,
        "specialMove": "Lesson in Love",
        "rarity": "Rare",
        "theme": "Education",
        "humorStyle": "Instructive",
        "role": "Teacher",
        "interactionStyle": "Engaging",
        "voiceLine": "Class is in session, and so is our romance.",
        "collectibilityFactor": 7
    },
    {
        "name": "Librarian Lore",
        "description": "Librarian Lore, a teddy bear who guards secrets and tales of old, knows that the most intriguing stories are often whispered among the bookshelves with a subtle paw.",
        "attackDamage": 21,
        "health": 91,
        "specialMove": "Silent Suggestion",
        "rarity": "Rare",
        "theme": "Librarian",
        "humorStyle": "Intellectual",
        "role": "Keeper of Knowledge",
        "interactionStyle": "Subtle",
        "voiceLine": "Let's turn the page to a new chapter of intimacy.",
        "collectibilityFactor": 8
    },
    {
        "name": "Engineer Gearloft",
        "description": "Engineer Gearloft, a teddy bear specializing in the mechanics of heartbeats and heartbreaks, fine-tunes the machinery of love with his plush tools and precise touch.",
        "attackDamage": 24,
        "health": 88,
        "specialMove": "Mechanical Embrace",
        "rarity": "Rare",
        "theme": "Engineering",
        "humorStyle": "Technical",
        "role": "Engineer",
        "interactionStyle": "Precise",
        "voiceLine": "Let's engineer the perfect evening.",
        "collectibilityFactor": 8
    },
    {
        "name": "Farmer Fields",
        "description": "Farmer Fields is a teddy bear who tends to his crops with care. He knows the importance of cultivating love and reaping the rewards of a heart well-tended with his plush hands.",
        "attackDamage": 23,
        "health": 89,
        "specialMove": "Harvest Heart",
        "rarity": "Rare",
        "theme": "Agriculture",
        "humorStyle": "Earthy",
        "role": "Farmer",
        "interactionStyle": "Grounded",
        "voiceLine": "Let's plant the seeds of our future together.",
        "collectibilityFactor": 8
    },
    {
        "name": "Detective Charm",
        "description": "Detective Charm, a keen-eyed teddy bear, solves mysteries of love with cunning and finesse, his plush coat concealing his detective tools and a heart full of intrigue.",
        "attackDamage": 25,
        "health": 92,
        "specialMove": "Intriguing Inquiry",
        "rarity": "Rare",
        "theme": "Detective",
        "humorStyle": "Mysterious",
        "role": "Investigator",
        "interactionStyle": "Analytical",
        "voiceLine": "I'll uncover all your secrets.",
        "collectibilityFactor": 9
    },
    {
        "name": "Chef CuddleCuisine",
        "description": "Chef CuddleCuisine, a master of flavors and affections, is a teddy bear who whips up dishes and desires with equal expertise, making him a warm presence in any kitchen.",
        "attackDamage": 24,
        "health": 93,
        "specialMove": "Flavor of Love",
        "rarity": "Rare",
        "theme": "Culinary",
        "humorStyle": "Passionate",
        "role": "Chef",
        "interactionStyle": "Warm",
        "voiceLine": "Taste the passion.",
        "collectibilityFactor": 9
    },
    {
        "name": "Baker Bliss",
        "description": "Baker Bliss is a teddy bear who crafts the sweetest treats. With hands that turn up the heat in kitchens and hearts alike, he's a nurturing presence in any collection.",
        "attackDamage": 23,
        "health": 87,
        "specialMove": "Sweet Seduction",
        "rarity": "Rare",
        "theme": "Culinary",
        "humorStyle": "Sweet",
        "role": "Baker",
        "interactionStyle": "Nurturing",
        "voiceLine": "Let's bake some love together.",
        "collectibilityFactor": 8
    },
    {
        "name": "Pilot Pierce",
        "description": "Pilot Pierce, a high-flying teddy bear, soars above the clouds, navigating the skies and the heart with unparalleled precision and a daring cuddle at high altitudes.",
        "attackDamage": 24,
        "health": 88,
        "specialMove": "High Altitude Flirtation",
        "rarity": "Rare",
        "theme": "Aviation",
        "humorStyle": "Adventurous",
        "role": "Pilot",
        "interactionStyle": "Daring",
        "voiceLine": "Join the mile high heart club.",
        "collectibilityFactor": 8
    },
    {
        "name": "Nurse Tenderlove",
        "description": "Nurse Tenderlove is a teddy bear who's always ready to attend to your every ache. She administers a dose of passion and care with her plush hands and gentle heart.",
        "attackDamage": 22,
        "health": 90,
        "specialMove": "Healing Heart",
        "rarity": "Rare",
        "theme": "Medical",
        "humorStyle": "Caring",
        "role": "Nurse",
        "interactionStyle": "Compassionate",
        "voiceLine": "Let me take care of all your needs.",
        "collectibilityFactor": 7
    },
    {
        "name": "Samurai Shinzo",
        "description": "Samurai Shinzo, a master of blades and bearer of plush honor, slices through the air and hearts with precision, upholding the code of cuddly conduct.",
        "attackDamage": 29,
        "health": 90,
        "specialMove": "Samurai Embrace",
        "rarity": "Legendary",
        "theme": "Feudal Japan",
        "humorStyle": "Honorable",
        "role": "Shogun",
        "interactionStyle": "Respectful",
        "voiceLine": "A true warrior wins without a fight; a true lover wins with a cuddle.",
        "collectibilityFactor": 10
    },
    {
        "name": "Viking Vex",
        "description": "Viking Vex, a teddy bear with a roar that shakes the heavens, pillages hearts with the precision of a well-aimed axe. His fur as rugged as the seas he sails.",
        "attackDamage": 32,
        "health": 94,
        "specialMove": "Raiders' Rapture",
        "rarity": "Legendary",
        "theme": "Viking",
        "humorStyle": "Fearless",
        "role": "Warrior",
        "interactionStyle": "Bold",
        "voiceLine": "To the brave and the bold, the spoils of the heart!",
        "collectibilityFactor": 10
    },
    {
        "name": "Spartan Shield",
        "description": "Spartan Shield, a stalwart teddy bear, stands firm in the face of danger, his plush shield ever ready to protect all that is precious, especially hearts.",
        "attackDamage": 31,
        "health": 92,
        "specialMove": "Phalanx Passion",
        "rarity": "Legendary",
        "theme": "Spartan",
        "humorStyle": "Stoic",
        "role": "Guardian",
        "interactionStyle": "Protective",
        "voiceLine": "With this shield, I protect your heart.",
        "collectibilityFactor": 10
    },
    {
        "name": "Renaissance Rapture",
        "description": "Renaissance Rapture, an artistic teddy bear, paints hearts with the brush of passion, his fur as colorful as the canvases he adores.",
        "attackDamage": 27,
        "health": 89,
        "specialMove": "Painter's Poise",
        "rarity": "Legendary",
        "theme": "Renaissance",
        "humorStyle": "Artistic",
        "role": "Artist",
        "interactionStyle": "Creative",
        "voiceLine": "Let us blend our colors in the canvas of love.",
        "collectibilityFactor": 10
    },
    {
        "name": "Baroque Blush",
        "description": "Baroque Blush, a teddy bear of elaborate and ornate tastes, flirts with extravagance and embraces the opulence of emotions with every stitch of his plush being.",
        "attackDamage": 25,
        "health": 87,
        "specialMove": "Ornate Overload",
        "rarity": "Legendary",
        "theme": "Baroque",
        "humorStyle": "Elaborate",
        "role": "Aristocrat",
        "interactionStyle": "Flamboyant",
        "voiceLine": "Dive into the drama of decadence and desire.",
        "collectibilityFactor": 10
    },
    {
        "name": "Geisha Grace",
        "description": "Geisha Grace is a teddy bear with timeless elegance and a soothing presence. She captivates hearts with a whisper and a smile, her plush fur as graceful as her moves.",
        "attackDamage": 24,
        "health": 90,
        "specialMove": "Subtle Seduction",
        "rarity": "Legendary",
        "theme": "Edo Period",
        "humorStyle": "Graceful",
        "role": "Entertainer",
        "interactionStyle": "Subtle",
        "voiceLine": "In the art of affection, a whisper can roar louder than a shout.",
        "collectibilityFactor": 10
    },
    {
        "name": "Knight's Kiss",
        "description": "Knight's Kiss, a chivalrous teddy bear, rescues damsels and masters the art of the heart with his gallant charm and plush swordplay.",
        "attackDamage": 28,
        "health": 91,
        "specialMove": "Chivalrous Charm",
        "rarity": "Legendary",
        "theme": "Medieval",
        "humorStyle": "Gallant",
        "role": "Knight",
        "interactionStyle": "Gentlemanly",
        "voiceLine": "Fear not, fair maiden, for your knight has arrived.",
        "collectibilityFactor": 10
    },
    {
        "name": "Czarina's Caress",
        "description": "From the frostbitten realms of the Tsars, Czarina's Caress, a teddy bear, brings a warmth that thaws the coldest of hearts with her regal and cuddly embrace.",
        "attackDamage": 30,
        "health": 95,
        "specialMove": "Imperial Embrace",
        "rarity": "Legendary",
        "theme": "Russian Empire",
        "humorStyle": "Regal",
        "role": "Monarch",
        "interactionStyle": "Warm",
        "voiceLine": "Let the fire of my heart melt the ice of yours.",
        "collectibilityFactor": 10
    },
    {
        "name": "Peter Playful",
        "description": "Once a leader of the lost boys, Peter Playful is now a teddy bear captain of clandestine adult adventures, leading with a charm only a plush explorer could have.",
        "attackDamage": 24,
        "health": 86,
        "specialMove": "Neverland Naughtiness",
        "rarity": "Rare",
        "theme": "Fantasy",
        "humorStyle": "Adventurous",
        "role": "Explorer",
        "interactionStyle": "Mischievous",
        "voiceLine": "Let's discover a world of grown-up pleasures.",
        "collectibilityFactor": 7
    },
    {
        "name": "Alice in Wonderlust",
        "description": "Alice in Wonderlust is a teddy bear venturing through a land of curiosities and sensual delights. She masters the game of hearts with whimsical wonder and a plush touch.",
        "attackDamage": 22,
        "health": 88,
        "specialMove": "Curious Caress",
        "rarity": "Rare",
        "theme": "Adventure",
        "humorStyle": "Whimsical",
        "role": "Adventurer",
        "interactionStyle": "Curious",
        "voiceLine": "Follow me down the rabbit hole to a land of wonders.",
        "collectibilityFactor": 8
    },
    {
        "name": "Goldilocks",
        "description": "Goldilocks, seeking pleasures that are 'just right,' this teddy bear knows how to choose her spots perfectly, making each adventure as cozy as her fur.",
        "attackDamage": 21,
        "health": 87,
        "specialMove": "Perfect Fit",
        "rarity": "Rare",
        "theme": "Adventure",
        "humorStyle": "Inquisitive",
        "role": "Explorer",
        "interactionStyle": "Selective",
        "voiceLine": "Too hot, too cold, and just right – let’s find our perfect adventure.",
        "collectibilityFactor": 7
    },
    {
        "name": "Red Riding Hood",
        "description": "No longer a little girl, Red Riding Hood, now a bold and daring teddy bear, knows the woods' paths and delights in the company of wolves, guiding them with her plush cunning.",
        "attackDamage": 23,
        "health": 90,
        "specialMove": "Wolf's Whisper",
        "rarity": "Rare",
        "theme": "Fairytale",
        "humorStyle": "Bold",
        "role": "Explorer",
        "interactionStyle": "Daring",
        "voiceLine": "What big heart you have, the better to love you with!",
        "collectibilityFactor": 8
    },
    {
        "name": "Jack and the Beanstalk",
        "description": "Jack, a teddy bear climbing to new heights, seeks the giants of passion in the clouds of desire, his plush fur billowing in the winds of adventure.",
        "attackDamage": 22,
        "health": 92,
        "specialMove": "Giant's Embrace",
        "rarity": "Rare",
        "theme": "Adventure",
        "humorStyle": "Daring",
        "role": "Adventurer",
        "interactionStyle": "Ambitious",
        "voiceLine": "Let's climb to new peaks of pleasure.",
        "collectibilityFactor": 7
    },
    {
        "name": "Snow White's Kiss",
        "description": "Awakened by a kiss, Snow White's Kiss is a teddy bear who now explores the forbidden fruits of the forest, enchanting all with her plush purity and hidden depths.",
        "attackDamage": 20,
        "health": 89,
        "specialMove": "Enchanted Awakening",
        "rarity": "Rare",
        "theme": "Fairytale",
        "humorStyle": "Enchanting",
        "role": "Princess",
        "interactionStyle": "Sensual",
        "voiceLine": "Who needs princes when you can have adventures?",
        "collectibilityFactor": 8
    },
    {
        "name": "Hansel and Gretel",
        "description": "Together they wandered into the world of grown-up delights. Hansel and Gretel, now teddy bears, leave breadcrumbs of passion behind, their plush hands intertwined.",
        "attackDamage": 25,
        "health": 91,
        "specialMove": "Trail of Temptation",
        "rarity": "Rare",
        "theme": "Fairytale",
        "humorStyle": "Mysterious",
        "role": "Explorers",
        "interactionStyle": "Intriguing",
        "voiceLine": "Follow the trail to a tale of indulgence.",
        "collectibilityFactor": 8
    },
    {
        "name": "Beauty's Beast",
        "description": "Beauty's Beast, a teddy bear, is the master of the castle of secrets. He unveils the mysteries of love with a gentle yet fierce touch, his plush fur a comfort in the shadows.",
        "attackDamage": 26,
        "health": 93,
        "specialMove": "Beastly Courtship",
        "rarity": "Rare",
        "theme": "Fairytale",
        "humorStyle": "Passionate",
        "role": "Beast",
        "interactionStyle": "Protective",
        "voiceLine": "Let the beauty within tame the beast without.",
        "collectibilityFactor": 9
    },
    {
        "name": "Cinderella's Midnight",
        "description": "When the clock strikes midnight, Cinderella doesn't flee; she turns the night into a ball of passion. This teddy bear dances into the hearts of all who meet her.",
        "attackDamage": 24,
        "health": 90,
        "specialMove": "Midnight Enchantment",
        "rarity": "Rare",
        "theme": "Fairytale",
        "humorStyle": "Romantic",
        "role": "Princess",
        "interactionStyle": "Enchanting",
        "voiceLine": "Forget the shoe; let's find our fantasy.",
        "collectibilityFactor": 8
    },
    {
        "name": "The Little Mermaid's Whisper",
        "description": "From under the sea to the shores of the heart, The Little Mermaid's Whisper sings siren songs that lure sailors into the depths of desire, her plush scales shimmering in the moonlight.",
        "attackDamage": 23,
        "health": 92,
        "specialMove": "Siren's Call",
        "rarity": "Rare",
        "theme": "Fairytale",
        "humorStyle": "Captivating",
        "role": "Mermaid",
        "interactionStyle": "Mystical",
        "voiceLine": "Dive deep with me into the ocean of passion.",
        "collectibilityFactor": 9
    },
    {
        "name": "Mistress Maribear",
        "description": "Mistress Maribear, a commanding teddy bear, dominates the plush world with her charm and whips. She knows how to keep everyone in line with a soft paw and a firm hug.",
        "attackDamage": 27,
        "health": 85,
        "specialMove": "Dominant Display",
        "rarity": "Legendary",
        "theme": "BDSM",
        "humorStyle": "Commanding",
        "role": "Dominatrix",
        "interactionStyle": "Assertive",
        "voiceLine": "Submit to the cuddle, and you may just earn a pat.",
        "collectibilityFactor": 9
    },
    {
        "name": "Bachelor Barry",
        "description": "Bachelor Barry, the ultimate party teddy bear, always ready with a cheeky joke and a martini in paw. He mingles with an effortless charm that makes him the life of any plush gathering.",
        "attackDamage": 24,
        "health": 88,
        "specialMove": "Charming Wink",
        "rarity": "Rare",
        "theme": "Party",
        "humorStyle": "Flirtatious",
        "role": "Playboy",
        "interactionStyle": "Sociable",
        "voiceLine": "Why settle for one when you can mingle with many?",
        "collectibilityFactor": 7
    },
    {
        "name": "Cabaret Cara",
        "description": "Cabaret Cara dazzles with feathers and sequins, turning the night into a spectacle of allure and tease. This teddy bear is a true star of the plush cabaret, captivating all who watch her.",
        "attackDamage": 22,
        "health": 90,
        "specialMove": "Seductive Spin",
        "rarity": "Rare",
        "theme": "Burlesque",
        "humorStyle": "Sensual",
        "role": "Dancer",
        "interactionStyle": "Enticing",
        "voiceLine": "Let's make every moment a showstopper.",
        "collectibilityFactor": 8
    },
    {
        "name": "Dapper Dan",
        "description": "Dapper Dan, always dressed to impress, this teddy bear knows how to turn on the charm and the style. His plush suit and polished paws make him a suitor of high plush society.",
        "attackDamage": 23,
        "health": 87,
        "specialMove": "Gentleman's Gambit",
        "rarity": "Uncommon",
        "theme": "Gentleman",
        "humorStyle": "Classy",
        "role": "Suitor",
        "interactionStyle": "Polished",
        "voiceLine": "A bear of taste is never a waste.",
        "collectibilityFactor": 6
    },
    {
        "name": "Vixen Veronica",
        "description": "With a stare that undresses and a wit that impresses, Vixen Veronica is the queen of the night scene. This teddy bear captivates with her plush allure and magnetic presence.",
        "attackDamage": 26,
        "health": 92,
        "specialMove": "Nocturnal Charm",
        "rarity": "Legendary",
        "theme": "Nightlife",
        "humorStyle": "Captivating",
        "role": "Vixen",
        "interactionStyle": "Magnetic",
        "voiceLine": "Come closer, let's share a secret or two.",
        "collectibilityFactor": 9
    },
    {
        "name": "Temptress Tanya",
        "description": "Temptress Tanya, a teddy bear who knows what you want before you do, weaves a web of desire and delight with her plush charm and alluring gaze.",
        "attackDamage": 25,
        "health": 89,
        "specialMove": "Enthralling Advance",
        "rarity": "Rare",
        "theme": "Seductress",
        "humorStyle": "Enchanting",
        "role": "Temptress",
        "interactionStyle": "Alluring",
        "voiceLine": "Surrender to temptation; it's so much sweeter.",
        "collectibilityFactor": 8
    },
    {
        "name": "Count Cuddula",
        "description": "Count Cuddula, with a penchant for the neck, this vampire teddy bear gets under your skin in the best way possible. His plush fangs are ready for a gentle nibble.",
        "attackDamage": 27,
        "health": 86,
        "specialMove": "Vampiric Embrace",
        "rarity": "Legendary",
        "theme": "Vampire",
        "humorStyle": "Mysterious",
        "role": "Count",
        "interactionStyle": "Intense",
        "voiceLine": "Let's explore the night... and each other.",
        "collectibilityFactor": 9
    },
    {
        "name": "Naughty Nurse Nelly",
        "description": "Naughty Nurse Nelly, with unparalleled bedside manner, offers a very personal touch. This teddy bear heals with hugs and soothes with her plush, caring paws.",
        "attackDamage": 21,
        "health": 91,
        "specialMove": "Healing Touch",
        "rarity": "Uncommon",
        "theme": "Nurse",
        "humorStyle": "Caring",
        "role": "Healer",
        "interactionStyle": "Intimate",
        "voiceLine": "Trust me, I'm a professional... in more ways than one.",
        "collectibilityFactor": 7
    },
    {
        "name": "Sailor Seamus",
        "description": "Sailor Seamus, a teddy bear who knows how to navigate the rough waters and the smooth, especially when it comes to romance. His plush sailor's cap is never far from adventure.",
        "attackDamage": 24,
        "health": 83,
        "specialMove": "Salty Seduction",
        "rarity": "Rare",
        "theme": "Sailor",
        "humorStyle": "Rugged",
        "role": "Navigator",
        "interactionStyle": "Charming",
        "voiceLine": "Let's set sail on an adventure of passion.",
        "collectibilityFactor": 8
    },
    {
        "name": "Librarian Loretta",
        "description": "Librarian Loretta may shush you in the stacks, but she's all about loud whispers and silent giggles elsewhere. This teddy bear keeps secrets and stories within her plush library.",
        "attackDamage": 19,
        "health": 85,
        "specialMove": "Silent Suggestion",
        "rarity": "Uncommon",
        "theme": "Librarian",
        "humorStyle": "Subtle",
        "role": "Keeper of Secrets",
        "interactionStyle": "Provocative",
        "voiceLine": "This library is full of stories... let's write ours.",
        "collectibilityFactor": 6
    }
]
.
];

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected successfully');
    return addTeddies();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });

async function addTeddies() {
  try {
    for (const teddyData of teddiesToAdd) {
      const newTeddy = new Teddy(teddyData);
      await newTeddy.save();
      console.log(`Added new teddy: ${newTeddy.name}`);
    }
    console.log('All teddies have been added successfully');
  } catch (error) {
    console.error('Error adding teddies:', error.message);
    console.error(error.stack);
  } finally {
    mongoose.connection.close(() => {
      console.log('MongoDB connection closed');
    });
  }
}