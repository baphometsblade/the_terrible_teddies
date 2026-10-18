const session = require('express-session');

const DEFAULT_MAX_SESSIONS = 10000;
// A cookie with no expiry lives as long as the browser keeps it, but the store
// still needs an end date to sweep against.
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * An in-memory session store that cannot grow without limit.
 *
 * express-session's built-in MemoryStore never evicts. An expired session is
 * dropped only if somebody presents its cookie again, and a visitor who has
 * gone never will. Measured on this app, every cookie-less POST /play/start
 * left about a kilobyte behind, in a straight line with no ceiling, so anyone
 * able to send requests could fill the server's memory. The demo runs on
 * exactly this store (no DATABASE_URL means no Mongo store), and it is the
 * public face of the deployment.
 *
 * Same contract as MemoryStore: sessions are serialised, so a handler cannot
 * change what is stored by mutating what it was given. Two limits are added:
 *
 *   - a cap on the number of sessions. Past it the least recently used one is
 *     dropped, which for a demo means somebody's abandoned battle;
 *   - a periodic sweep that drops expired sessions without waiting for anyone
 *     to read them.
 *
 * For demo mode only. A real deployment uses the Mongo store.
 */
class BoundedSessionStore extends session.Store {
  constructor({ maxSessions = DEFAULT_MAX_SESSIONS, sweepIntervalMs = 60 * 1000, now = Date.now } = {}) {
    super();
    if (!Number.isInteger(maxSessions) || maxSessions < 1) {
      throw new RangeError('maxSessions must be a positive integer');
    }

    this.maxSessions = maxSessions;
    this.now = now;
    // A Map iterates in insertion order. Every read and write re-inserts its
    // entry at the end, so the first key is always the least recently used.
    this.entries = new Map();

    this.sweeper = setInterval(() => this.sweep(), sweepIntervalMs);
    // Tidying memory is never a reason to keep the process alive.
    this.sweeper.unref();
  }

  close() {
    clearInterval(this.sweeper);
  }

  // Marks an entry as the most recently used, then enforces the cap.
  remember(sid, entry) {
    this.entries.delete(sid);
    this.entries.set(sid, entry);
    while (this.entries.size > this.maxSessions) {
      this.entries.delete(this.entries.keys().next().value);
    }
  }

  // The entry for sid, or null if there is none or it has expired.
  live(sid) {
    const entry = this.entries.get(sid);
    if (!entry) return null;
    if (entry.expires <= this.now()) {
      this.entries.delete(sid);
      return null;
    }
    return entry;
  }

  // Removes every expired session and says how many went.
  sweep() {
    const now = this.now();
    let removed = 0;
    for (const [sid, entry] of this.entries) {
      if (entry.expires <= now) {
        this.entries.delete(sid);
        removed += 1;
      }
    }
    return removed;
  }

  get(sid, callback) {
    const entry = this.live(sid);
    if (entry) this.remember(sid, entry);
    later(callback, null, entry ? JSON.parse(entry.data) : null);
  }

  set(sid, sess, callback) {
    let data;
    try {
      data = JSON.stringify(sess);
    } catch (error) {
      later(callback, error);
      return;
    }
    this.remember(sid, { data, expires: expiryOf(sess, this.now()) });
    later(callback, null);
  }

  // Like MemoryStore, only the cookie is refreshed: touch is called for a
  // session that was read but not changed.
  touch(sid, sess, callback) {
    const entry = this.live(sid);
    if (entry) {
      const stored = JSON.parse(entry.data);
      stored.cookie = sess.cookie;
      entry.data = JSON.stringify(stored);
      entry.expires = expiryOf(sess, this.now());
      this.remember(sid, entry);
    }
    later(callback, null);
  }

  destroy(sid, callback) {
    this.entries.delete(sid);
    later(callback, null);
  }

  clear(callback) {
    this.entries.clear();
    later(callback, null);
  }

  length(callback) {
    this.sweep();
    later(callback, null, this.entries.size);
  }

  all(callback) {
    this.sweep();
    const sessions = {};
    for (const [sid, entry] of this.entries) sessions[sid] = JSON.parse(entry.data);
    later(callback, null, sessions);
  }
}

function expiryOf(sess, now) {
  const expires = sess && sess.cookie && sess.cookie.expires;
  const when = expires ? new Date(expires).getTime() : NaN;
  return Number.isFinite(when) ? when : now + DEFAULT_TTL_MS;
}

// Callbacks run on a later tick, as MemoryStore does, so a caller never sees
// them fire before the call that made them has returned.
function later(callback, ...args) {
  if (typeof callback === 'function') setImmediate(callback, ...args);
}

// DEMO_MAX_SESSIONS arrives as text. Anything that is not a whole number of at
// least one falls back to the default instead of stopping the server booting.
function parseMaxSessions(value, fallback = DEFAULT_MAX_SESSIONS) {
  const parsed = Math.floor(Number(value));
  return parsed >= 1 ? parsed : fallback;
}

module.exports = BoundedSessionStore;
module.exports.BoundedSessionStore = BoundedSessionStore;
module.exports.parseMaxSessions = parseMaxSessions;
module.exports.DEFAULT_MAX_SESSIONS = DEFAULT_MAX_SESSIONS;
