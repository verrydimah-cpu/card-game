/* Emberfall Duel — game engine: state, turns, enemy AI and scoring.
   Pure logic; ui.js renders whatever this module reports. */
'use strict';

const PLAYER_MAX_HP = 40;
const ENEMY_MAX_HP = 32;
const ENERGY_PER_TURN = 3;
const HAND_SIZE = 5;

/* Enemy intents. The Warden telegraphs his next move so the player can counter it. */
const ENEMY_INTENTS = [
  { kind: 'attack', damage: 6, label: 'Slashes for 6 damage' },
  { kind: 'attack', damage: 9, label: 'Hurls a fireball for 9 damage' },
  { kind: 'attack-block', damage: 5, block: 6, label: 'Strikes for 5 and raises 6 block' },
  { kind: 'smolder', damage: 3, burn: 4, label: 'Smolders you: 3 damage and Burn 4' },
  { kind: 'attack', damage: 12, label: 'WINDS UP a heavy blow for 12 damage!' },
];

/* Deterministic RNG (mulberry32) when a seed is given, so screenshot runs replay exactly. */
function makeRng(seed) {
  if (seed === null || seed === undefined) return Math.random;
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

function createGame(seed) {
  const rng = makeRng(seed);
  const game = {
    seed: seed,
    rng: rng,
    turn: 1,
    phase: 'title', // title | playing | won | lost
    player: { hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP, block: 0, burn: 0, energy: ENERGY_PER_TURN },
    enemy: { hp: ENEMY_MAX_HP, maxHp: ENEMY_MAX_HP, block: 0, burn: 0, intent: null },
    drawPile: shuffleInPlace(buildDeck(), rng),
    hand: [],
    discardPile: [],
    cardsPlayed: 0,
    damageDealt: 0,
    damageTaken: 0,
    log: [],
  };
  game.enemy.intent = pickIntent(game);
  return game;
}

function pickIntent(game) {
  const idx = Math.floor(game.rng() * ENEMY_INTENTS.length);
  return ENEMY_INTENTS[idx];
}

function logLine(game, html, cls) {
  game.log.push({ html: html, cls: cls || '' });
  if (game.log.length > 40) game.log.shift();
}

function startDuel(game) {
  game.phase = 'playing';
  game.turn = 1;
  game.player.energy = ENERGY_PER_TURN;
  drawCards(game, HAND_SIZE);
  logLine(game, '<span class="log-turn">Turn 1 —</span> The duel begins! The Warden intends: <b>' + game.enemy.intent.label + '</b>.');
}

function drawCards(game, n) {
  for (let i = 0; i < n; i++) {
    if (game.drawPile.length === 0) {
      if (game.discardPile.length === 0) return;
      game.drawPile = shuffleInPlace(game.discardPile, game.rng);
      game.discardPile = [];
      logLine(game, 'Your discard pile is reshuffled into the draw pile.');
    }
    game.hand.push(game.drawPile.pop());
  }
}

function canPlay(game, card) {
  return game.phase === 'playing' && cardDef(card).cost <= game.player.energy;
}

function applyDamage(target, amount) {
  const blocked = Math.min(target.block, amount);
  target.block -= blocked;
  const dealt = amount - blocked;
  target.hp = Math.max(0, target.hp - dealt);
  return dealt;
}

function playCard(game, handIndex) {
  if (game.phase !== 'playing') return null;
  const card = game.hand[handIndex];
  if (!card) return null;
  const def = cardDef(card);
  const fx = cardEffect(card);
  if (def.cost > game.player.energy) return null;
  game.player.energy -= def.cost;
  game.hand.splice(handIndex, 1);
  game.discardPile.push(card);
  game.cardsPlayed += 1;

  const parts = [];
  if (fx.damage) {
    const dealt = applyDamage(game.enemy, fx.damage);
    game.damageDealt += dealt;
    parts.push('dealt <b>' + dealt + '</b> damage');
  }
  if (fx.burn) {
    game.enemy.burn += fx.burn;
    parts.push('applied <b>Burn ' + fx.burn + '</b>');
  }
  if (fx.block) {
    game.player.block += fx.block;
    parts.push('gained <b>' + fx.block + '</b> block');
  }
  if (fx.heal) {
    const healed = Math.min(fx.heal, game.player.maxHp - game.player.hp);
    game.player.hp += healed;
    parts.push('healed <b>' + healed + '</b> HP');
  }
  if (fx.draw) {
    drawCards(game, fx.draw);
    parts.push('drew <b>' + fx.draw + '</b> cards');
  }
  logLine(game, 'You played <b>' + def.name + '</b> — ' + parts.join(', ') + '.', 'log-good');
  checkEnd(game);
  return { card: card, def: def };
}

function checkEnd(game) {
  if (game.enemy.hp <= 0) {
    game.phase = 'won';
    logLine(game, '<b>The Ashen Warden crumbles to ash. You win!</b>', 'log-good');
  } else if (game.player.hp <= 0) {
    game.phase = 'lost';
    logLine(game, '<b>Your ember fades. The Warden wins.</b>', 'log-bad');
  }
}

function endTurn(game) {
  if (game.phase !== 'playing') return;
  // Burn ticks on the Warden at the end of your turn.
  if (game.enemy.burn > 0) {
    const dealt = applyDamage(game.enemy, game.enemy.burn);
    game.damageDealt += dealt;
    logLine(game, 'Burn sears the Warden for <b>' + dealt + '</b> damage.', 'log-good');
    checkEnd(game);
    if (game.phase === 'won') return;
  }
  // The Warden acts on his telegraphed intent. Your block absorbs the blow first,
  // then falls away as the new turn begins.
  const intent = game.enemy.intent;
  let acted = '';
  if (intent.kind === 'attack' || intent.kind === 'attack-block' || intent.kind === 'smolder') {
    const dealt = applyDamage(game.player, intent.damage);
    game.damageTaken += dealt;
    acted = 'The Warden ' + intent.label.toLowerCase() + ' — you take <b>' + dealt + '</b> damage.';
  }
  if (intent.block) {
    game.enemy.block += intent.block;
    acted += ' He raises <b>' + intent.block + '</b> block.';
  }
  if (intent.burn) {
    game.player.burn += intent.burn;
    acted += ' You are <b>Burning ' + game.player.burn + '</b>.';
  }
  logLine(game, acted, 'log-bad');
  if (game.player.hp <= 0) { game.phase = 'lost'; logLine(game, '<b>Your ember fades. The Warden wins.</b>', 'log-bad'); return; }
  // Your burn ticks at the start of your new turn.
  if (game.player.burn > 0) {
    const dealt = applyDamage(game.player, game.player.burn);
    game.damageTaken += dealt;
    logLine(game, 'Your burns sear you for <b>' + dealt + '</b> damage.', 'log-bad');
    game.player.burn = Math.max(0, game.player.burn - 1);
    if (game.player.hp <= 0) { game.phase = 'lost'; return; }
  }
  // New turn: fresh energy, block falls, draw up to five.
  game.turn += 1;
  game.enemy.block = 0;
  game.player.block = 0;
  game.player.energy = ENERGY_PER_TURN;
  game.enemy.intent = pickIntent(game);
  game.discardPile.push.apply(game.discardPile, game.hand.splice(0));
  drawCards(game, HAND_SIZE);
  logLine(game, '<span class="log-turn">Turn ' + game.turn + ' —</span> You draw up to five cards. The Warden intends: <b>' + game.enemy.intent.label + '</b>.');
}

function gameScore(game) {
  return game.damageDealt * 10 + game.player.hp * 5 + Math.max(0, 8 - game.turn) * 25 + game.cardsPlayed * 3;
}
