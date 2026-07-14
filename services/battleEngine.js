function cloneFighter(teddy) {
  if (!teddy || !teddy.name) {
    throw new Error('A valid teddy is required');
  }

  return {
    id: String(teddy._id || teddy.id || teddy.name),
    name: teddy.name,
    maxHealth: Number(teddy.health || 100),
    health: Number(teddy.health || 100),
    attackDamage: Number(teddy.attackDamage || 10),
    specialMove: teddy.specialMove || 'Stuffing Strike',
    rarity: teddy.rarity || 'Common',
    strategyLevel: Number(teddy.strategyLevel || 50),
    adaptability: Number(teddy.adaptability || 50),
    voiceLine: teddy.voiceLine || 'Prepare for fluff.'
  };
}

function rarityBonus(rarity) {
  const bonuses = {
    Common: 0,
    Uncommon: 2,
    Rare: 4,
    Legendary: 7
  };
  return bonuses[rarity] || 0;
}

function calculateDamage(attacker, defender, move = 'attack', turn = 1) {
  const base = attacker.attackDamage + rarityBonus(attacker.rarity);
  const strategyBonus = Math.floor(attacker.strategyLevel / 25);
  const defenseOffset = Math.floor(defender.adaptability / 40);
  const specialMultiplier = move === 'special' ? 1.45 : 1;
  const turnSwing = (turn % 3) - 1;
  return Math.max(1, Math.round((base + strategyBonus + turnSwing - defenseOffset) * specialMultiplier));
}

function createBattle(playerTeddy, opponentTeddy) {
  const player = cloneFighter(playerTeddy);
  const opponent = cloneFighter(opponentTeddy);

  return {
    turn: 1,
    status: 'active',
    winner: null,
    player,
    opponent,
    log: [
      `${player.name} enters the fluff pit.`,
      `${opponent.name} answers with ${opponent.voiceLine}`
    ]
  };
}

function executeTurn(battle, playerMove = 'attack') {
  if (!battle || battle.status !== 'active') {
    return battle;
  }

  const next = JSON.parse(JSON.stringify(battle));
  const playerDamage = calculateDamage(next.player, next.opponent, playerMove, next.turn);
  next.opponent.health = Math.max(0, next.opponent.health - playerDamage);
  next.log.push(`${next.player.name} uses ${playerMove === 'special' ? next.player.specialMove : 'Basic Bonk'} for ${playerDamage} damage.`);

  if (next.opponent.health <= 0) {
    next.status = 'finished';
    next.winner = 'player';
    next.log.push(`${next.opponent.name} bursts into dramatic stuffing. You win.`);
    return next;
  }

  const opponentMove = next.turn % 2 === 0 ? 'special' : 'attack';
  const opponentDamage = calculateDamage(next.opponent, next.player, opponentMove, next.turn);
  next.player.health = Math.max(0, next.player.health - opponentDamage);
  next.log.push(`${next.opponent.name} uses ${opponentMove === 'special' ? next.opponent.specialMove : 'Counter Cuddle'} for ${opponentDamage} damage.`);

  if (next.player.health <= 0) {
    next.status = 'finished';
    next.winner = 'opponent';
    next.log.push(`${next.player.name} is flattened into premium carpet fluff. You lose.`);
    return next;
  }

  next.turn += 1;
  return next;
}

function autoBattle(playerTeddy, opponentTeddy, movePlan = ['attack', 'special', 'attack', 'special']) {
  let battle = createBattle(playerTeddy, opponentTeddy);
  let moveIndex = 0;

  while (battle.status === 'active' && battle.turn <= 20) {
    battle = executeTurn(battle, movePlan[moveIndex % movePlan.length]);
    moveIndex += 1;
  }

  if (battle.status === 'active') {
    battle.status = 'finished';
    battle.winner = battle.player.health >= battle.opponent.health ? 'player' : 'opponent';
    battle.log.push('The judges call time and award victory by remaining fluff mass.');
  }

  return battle;
}

module.exports = {
  cloneFighter,
  calculateDamage,
  createBattle,
  executeTurn,
  autoBattle
};
