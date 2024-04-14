const EventEmitter = require('events');

class CombatEmitter extends EventEmitter {}

const combatEvents = new CombatEmitter();

module.exports = combatEvents;