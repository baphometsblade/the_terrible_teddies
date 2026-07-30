const Player = require('../models/Player');

/**
 * Resolve the Player profile for the logged-in User.
 *
 * Prefers the Player.user reference. Falls back to matching on username so
 * profiles created before the reference existed keep working until
 * scripts/linkPlayersToUsers.js has been run; when the fallback hits, the link
 * is written back so the next lookup takes the fast path.
 *
 * `model` is injectable so the branching can be unit tested without a live
 * MongoDB.
 *
 * Returns null when there is no session or no profile.
 */
async function currentPlayer(req, { model = Player } = {}) {
  const userId = req && req.session && req.session.userId;
  if (!userId) return null;

  const linked = await model.findOne({ user: userId });
  if (linked) return linked;

  const username = req.session.user && req.session.user.username;
  if (!username) return null;

  const byUsername = await model.findOne({ username });
  if (!byUsername) return null;

  // Self-heal: adopt the profile only if no other account has claimed it.
  if (!byUsername.user) {
    byUsername.user = userId;
    await byUsername.save();
    console.log(`Linked player ${byUsername.username} to user ${userId}`);
  }

  return byUsername;
}

module.exports = { currentPlayer };
