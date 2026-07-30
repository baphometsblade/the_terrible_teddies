#!/usr/bin/env node
//
// One-off backfill: populate Player.user for profiles created before the
// reference existed, matching on username.
//
//   node scripts/linkPlayersToUsers.js --dry-run   # report only, no writes
//   node scripts/linkPlayersToUsers.js             # apply
//
// Safe to re-run: already-linked players are skipped.

require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const Player = require('../models/Player');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Nothing to do.');
    process.exit(1);
  }

  await mongoose.connect(process.env.DATABASE_URL);
  console.log(`Connected.${DRY_RUN ? ' DRY RUN - no writes will be made.' : ''}\n`);

  const unlinked = await Player.find({ $or: [{ user: null }, { user: { $exists: false } }] });
  console.log(`Players without a user link: ${unlinked.length}`);

  const stats = { linked: 0, noUser: 0, conflict: 0 };

  for (const player of unlinked) {
    const user = await User.findOne({ username: player.username });

    if (!user) {
      stats.noUser++;
      console.log(`  SKIP     ${player.username} - no User with that username`);
      continue;
    }

    const taken = await Player.findOne({ user: user._id });
    if (taken) {
      stats.conflict++;
      console.log(`  CONFLICT ${player.username} - user already linked to player ${taken.username}`);
      continue;
    }

    if (!DRY_RUN) {
      player.user = user._id;
      await player.save();
    }
    stats.linked++;
    console.log(`  ${DRY_RUN ? 'WOULD LINK' : 'LINKED   '} ${player.username} -> user ${user._id}`);
  }

  // Users with no Player at all cannot join teams or complete challenges.
  const users = await User.find({}, '_id username');
  const orphanUsers = [];
  for (const user of users) {
    const hasProfile = await Player.findOne({ $or: [{ user: user._id }, { username: user.username }] });
    if (!hasProfile) orphanUsers.push(user.username);
  }

  console.log('\n--- Summary ---');
  console.log(`Linked:                    ${stats.linked}`);
  console.log(`Skipped (no matching User): ${stats.noUser}`);
  console.log(`Conflicts:                  ${stats.conflict}`);
  console.log(`Users with no Player:       ${orphanUsers.length}${orphanUsers.length ? ' -> ' + orphanUsers.join(', ') : ''}`);
  if (orphanUsers.length) {
    console.log('\nThose accounts need a Player profile before they can join teams');
    console.log('or complete challenges. New registrations now create one automatically.');
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Backfill failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
