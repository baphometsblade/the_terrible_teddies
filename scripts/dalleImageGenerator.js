// Looks up a stock photo for each teddy on Unsplash and stores its URL in
// teddy.imageUrl.
//
//   node scripts/dalleImageGenerator.js --dry-run   # look up, but save nothing
//   node scripts/dalleImageGenerator.js --yes       # save
//
// Needs UNSPLASH_ACCESS_KEY. Three things to know before running it:
//
//  - It writes to every teddy, so it needs the same confirmation as the other
//    write scripts. It used to start the moment it was invoked.
//  - The URLs it stores are remote. The site's Content-Security-Policy only
//    allows images from 'self' and data:, and services/teddyAssets.js only
//    accepts same-origin paths, so they will not display until you add the host
//    (images.unsplash.com) to imgSrc in server.js and relax sameOriginPath.
//  - It never loaded dotenv and imported node-fetch, which was not a dependency.
//    Both are fixed: it reads .env and uses the fetch built into Node 18+.

require('dotenv').config();

const mongoose = require('mongoose');
const Teddy = require('../models/Teddy');
const logger = require('../config/loggingConfig');
const { requireWriteConfirmation } = require('../utils/scriptGuard');

const { databaseUrl, dryRun } = requireWriteConfirmation('scripts/dalleImageGenerator.js');

if (!process.env.UNSPLASH_ACCESS_KEY) {
  logger.error('UNSPLASH_ACCESS_KEY is not set in the environment.');
  process.exit(1);
}

async function main() {
  await mongoose.connect(databaseUrl);
  logger.info('Connected to MongoDB');

  try {
    const teddies = await Teddy.find();

    for (const teddy of teddies) {
      const query = encodeURIComponent(`${teddy.name} teddy bear`);
      // The key goes in a header, not the query string, so it does not end up in
      // URLs, proxies or logs.
      const response = await fetch(`https://api.unsplash.com/photos/random?query=${query}`, {
        headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data && data.urls && data.urls.regular) {
        if (dryRun) {
          logger.info(`WOULD set image for ${teddy.name}: ${data.urls.regular}`);
        } else {
          teddy.imageUrl = data.urls.regular;
          await teddy.save();
          logger.info(`Image for ${teddy.name} saved.`);
        }
      } else {
        logger.warn(`No image found for ${teddy.name}.`);
      }
    }
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

main()
  .then(() => logger.info('Image assignment completed.'))
  .catch((error) => {
    logger.error(`Image assignment failed: ${error.message}`);
    process.exitCode = 1;
  });
