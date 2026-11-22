/* Emberfall Duel — UI: renders engine state into the DOM and wires input.
   Mouse clicks, keyboard shortcuts and the overlay screens live here. */
'use strict';

let game = createGame(null);
const $ = function (id) { return document.getElementById(id); };

function hpPct(who) { return Math.max(0, Math.round(100 * who.hp / who.maxHp)); }

function render() {
  $('turn-num').textContent = game.turn;
  $('score-num').textContent = game.phase === 'title' ? 0 : gameScore(game);
  $('played-num').textContent = game.cardsPlayed;

  $('enemy-hp-fill').style.width = hpPct(game.enemy) + '%';
  $('enemy-hp-text').textContent = game.enemy.hp + ' / ' + game.enemy.maxHp;
  $('player-hp-fill').style.width = hpPct(game.player) + '%';
  $('player-hp-text').textContent = game.player.hp + ' / ' + game.player.maxHp;

  setBadge($('enemy-block'), game.enemy.block);
  setBadge($('player-block'), game.player.block);
  setBadge($('enemy-burn'), game.enemy.burn, '🔥 Burning ');
  setBadge($('player-burn'), game.player.burn, '🔥 Burning ');

  $('enemy-intent').innerHTML = game.phase === 'playing'
    ? 'Next move: <span class="intent-dmg">' + game.enemy.intent.label + '</span>'
    : 'The Warden waits…';

  const foeHand = $('enemy-hand');
  foeHand.innerHTML = '';
  const foeCards = Math.min(3, 1 + Math.floor(game.turn / 2));
  for (let i = 0; i < foeCards; i++) {
    const back = document.createElement('div');
    back.className = 'foe-card';
    back.textContent = '🔥';
    foeHand.appendChild(back);
  }

  $('draw-count').textContent = game.drawPile.length;
  $('discard-count').textContent = game.discardPile.length;

  const pips = $('energy-pips');
  pips.innerHTML = '';
  for (let i = 0; i < ENERGY_PER_TURN; i++) {
    const pip = document.createElement('div');
    pip.className = 'pip' + (i < game.player.energy ? ' on' : '');
    pips.appendChild(pip);
  }

  const logEl = $('log');
  logEl.innerHTML = game.log.map(function (l) {
    return '<div class="' + l.cls + '">' + l.html + '</div>';
  }).join('');
  logEl.scrollTop = logEl.scrollHeight;

  renderHand();
}

function setBadge(el, value, prefix) {
  if (value > 0) {
    el.hidden = false;
    el.textContent = (prefix || '🛡 ') + value;
  } else {
    el.hidden = true;
  }
}

function renderHand() {
  const handEl = $('hand');
  handEl.innerHTML = '';
  game.hand.forEach(function (card, i) {
    const def = cardDef(card);
    const el = document.createElement('div');
    el.className = 'card ' + def.suitClass + (canPlay(game, card) ? '' : ' unaffordable');
    el.dataset.index = i;
    el.innerHTML =
      '<div class="cost">' + def.cost + '</div>' +
      '<div class="card-name">' + def.name + '</div>' +
      '<div class="card-art"><span class="art-disc">' + def.art + '</span></div>' +
      '<div class="card-text">' + def.text + '</div>' +
      '<div class="key-hint">[' + (i + 1) + ']</div>' +
      '<div class="card-suit">' + def.suit + '</div>';
    el.addEventListener('click', function () { onCardClick(i, el); });
    handEl.appendChild(el);
  });
}

function onCardClick(index, el) {
  if (game.phase !== 'playing') return;
  const result = playCard(game, index);
  if (!result) return;
  el.classList.add('played');
  setTimeout(render, 180);
  render();
  if (game.phase === 'won') showEnd(true);
  else if (game.phase === 'lost') showEnd(false);
}

function showTitle() {
  const ov = $('overlay');
  ov.classList.remove('hidden');
  $('overlay-kicker').textContent = 'A DUEL OF EMBERS';
  const title = $('overlay-title');
  title.textContent = 'EMBERFALL DUEL';
  title.className = '';
  $('overlay-text').textContent = 'The Ashen Warden holds the last ember of the realm. Build your hand, spend your energy, and strike him down before his flames consume you.';
  $('overlay-stats').hidden = true;
  $('overlay-btn').textContent = '⚔ Begin the Duel';
  $('overlay-rules').hidden = false;
}

function showEnd(won) {
  const ov = $('overlay');
  ov.classList.remove('hidden');
  $('overlay-kicker').textContent = won ? '★ VICTORY ★' : 'THE EMBER FADES';
  const title = $('overlay-title');
  title.textContent = won ? 'YOU WIN!' : 'YOU LOSE';
  title.className = won ? 'win' : 'lose';
  $('overlay-text').textContent = won
    ? 'The Ashen Warden crumbles to ash and the last ember is yours. The realm breathes again — a flawless duel, Ember Knight!'
    : 'The Warden’s flames swallow your light. Your ember fades… but every duel teaches a new trick. Rise and try again!';
  const stats = $('overlay-stats');
  stats.hidden = false;
  stats.innerHTML =
    '<div class="stat">Score <b>' + gameScore(game) + '</b></div>' +
    '<div class="stat">Turns <b>' + game.turn + '</b></div>' +
    '<div class="stat">Damage dealt <b>' + game.damageDealt + '</b></div>' +
    '<div class="stat">HP left <b>' + game.player.hp + '</b></div>';
  $('overlay-btn').textContent = '↻ Play Again';
  $('overlay-rules').hidden = true;
}

function beginDuel() {
  game = createGame(game.seed);
  startDuel(game);
  $('overlay').classList.add('hidden');
  render();
}

function restartDuel() {
  game = createGame(game.seed);
  startDuel(game);
  $('overlay').classList.add('hidden');
  render();
}

$('overlay-btn').addEventListener('click', function () {
  if (game.phase === 'title') beginDuel();
  else restartDuel();
});
$('restart-btn').addEventListener('click', restartDuel);
$('end-turn-btn').addEventListener('click', function () {
  endTurn(game);
  render();
  if (game.phase === 'won') showEnd(true);
  else if (game.phase === 'lost') showEnd(false);
});

document.addEventListener('keydown', function (e) {
  if (game.phase === 'title' && (e.key === 'Enter' || e.key === ' ')) { beginDuel(); return; }
  if ((game.phase === 'won' || game.phase === 'lost') && (e.key === 'Enter' || e.key === 'r' || e.key === 'R')) { restartDuel(); return; }
  if (game.phase !== 'playing') return;
  if (e.key === 'e' || e.key === 'E' || e.key === ' ') {
    endTurn(game);
    render();
    if (game.phase === 'won') showEnd(true);
    else if (game.phase === 'lost') showEnd(false);
    return;
  }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= game.hand.length) {
    const card = game.hand[n - 1];
    if (card && canPlay(game, card)) {
      const el = document.querySelector('.card[data-index="' + (n - 1) + '"]');
      onCardClick(n - 1, el || document.createElement('div'));
    }
  }
});

showTitle();
render();
