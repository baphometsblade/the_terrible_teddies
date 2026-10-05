// Safety gate for scripts that write to the database.
//
// Every seed/repair script in this repo (fixDatabase.js, populateDatabase.js,
// populateItems.js, scripts/seed*.js, scripts/populateCustomItems.js) read
// DATABASE_URL from .env and started writing the moment they were invoked. That
// .env points at the live cluster, so a stray `node fixDatabase.js` rewrote
// production records with no confirmation and no way to preview.
//
// fixDatabase.js in particular overwrites health and attackDamage on ten
// teddies, which silently undoes any level-up progression those teddies had.
//
// Usage at the top of a write script:
//
//   const { requireWriteConfirmation, isDryRun } = require('./utils/scriptGuard');
//   const { databaseUrl } = requireWriteConfirmation('fixDatabase');
//
// Running without --yes prints what would happen and exits 0.

const DRY_RUN_FLAGS = ['--dry-run', '--dryrun', '-n'];
const CONFIRM_FLAGS = ['--yes', '-y'];

function isDryRun(argv = process.argv) {
  return argv.some((arg) => DRY_RUN_FLAGS.includes(arg));
}

function isConfirmed(argv = process.argv) {
  return argv.some((arg) => CONFIRM_FLAGS.includes(arg)) || process.env.CONFIRM_WRITE === '1';
}

/** Hide credentials before printing a connection string. */
function describeTarget(url) {
  if (!url) return '(DATABASE_URL not set)';
  try {
    const parsed = new URL(url);
    const database = parsed.pathname.replace(/^\//, '') || '(default)';
    return `${parsed.protocol}//${parsed.host}/${database}`;
  } catch {
    return '(unparseable DATABASE_URL)';
  }
}

/**
 * Gate a write script.
 *
 * Returns { databaseUrl, dryRun }. Exits the process when it should not run:
 * exit 1 if DATABASE_URL is missing, exit 0 if the operator has not confirmed
 * (not an error - they just asked without committing).
 */
function requireWriteConfirmation(scriptName) {
  const databaseUrl = process.env.DATABASE_URL;
  const dryRun = isDryRun();
  const target = describeTarget(databaseUrl);

  console.log(`\n${scriptName}: target database -> ${target}`);

  if (!databaseUrl) {
    console.error('DATABASE_URL is not set. Nothing to do.');
    process.exit(1);
  }

  if (dryRun) {
    console.log('DRY RUN - no writes will be made.\n');
    return { databaseUrl, dryRun: true };
  }

  if (!isConfirmed()) {
    console.error(
      [
        '',
        'Refusing to write without confirmation.',
        '',
        `  Preview:  node ${scriptName} --dry-run`,
        `  Apply:    node ${scriptName} --yes`,
        '',
        'This writes to the database above. If that is production, be sure.',
        ''
      ].join('\n')
    );
    process.exit(0);
  }

  console.log('Confirmed (--yes). Writing.\n');
  return { databaseUrl, dryRun: false };
}

module.exports = { requireWriteConfirmation, isDryRun, isConfirmed, describeTarget };
