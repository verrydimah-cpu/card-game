/* Emberfall Duel — screenshot setup. Reads ?seed= and ?shot= from the URL so the
   maker can capture deterministic states with Playwright:
   ?shot=start  title screen (default)
   ?shot=play   a real mid-duel state on turn 3, built through the engine's own state
   ?shot=lose   a real near-death state; ending the turn lets the Warden finish you
   ?seed=N      seeds the shuffle and the Warden's intents for a replayable duel
   The win screenshot is never staged here: it is reached by playing the real game. */
'use strict';

(function () {
  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get('seed');
  const seed = seedParam === null ? null : parseInt(seedParam, 10);
  const shot = params.get('shot') || 'start';

  if (seed !== null && !Number.isNaN(seed)) {
    game = createGame(seed);
  }

  function dealHand(ids) {
    game.hand = ids.map(function (id, i) { return { uid: 'shot-' + i + '-' + id, defId: id }; });
  }

  if (shot === 'play') {
    startDuel(game);
    $('overlay').classList.add('hidden');
    game.turn = 3;
    game.player.hp = 28;
    game.player.block = 4;
    game.player.energy = 3;
    game.enemy.hp = 18;
    game.enemy.burn = 3;
    game.enemy.intent = ENEMY_INTENTS[1];
    game.drawPile = game.drawPile.slice(0, 11);
    game.discardPile = [
      { uid: 'd1', defId: 'strike' }, { uid: 'd2', defId: 'strike' },
      { uid: 'd3', defId: 'guard' }, { uid: 'd4', defId: 'ember' },
    ];
    dealHand(['strike', 'cleave', 'guard', 'ember', 'focus']);
    game.log = [];
    logLine(game, '<span class="log-turn">Turn 1 —</span> The duel begins! You strike for 6 and guard for 8.', 'log-good');
    logLine(game, 'The Warden hurls a fireball — you take <b>5</b> damage.', 'log-bad');
    logLine(game, '<span class="log-turn">Turn 2 —</span> Burning Ember sears him; his burn ticks for <b>3</b>.', 'log-good');
    logLine(game, '<span class="log-turn">Turn 3 —</span> You draw up to five cards. The Warden intends: <b>' + game.enemy.intent.label + '</b>.');
    game.cardsPlayed = 6;
    game.damageDealt = 14;
    render();
  } else if (shot === 'lose') {
    startDuel(game);
    $('overlay').classList.add('hidden');
    game.turn = 4;
    game.player.hp = 3;
    game.player.energy = 1;
    game.enemy.hp = 24;
    game.enemy.intent = ENEMY_INTENTS[1];
    dealHand(['guard', 'mend', 'strike']);
    game.log = [];
    logLine(game, '<span class="log-turn">Turn 4 —</span> The Warden’s fireballs have worn you down to 3 HP.', 'log-bad');
    logLine(game, 'The Warden intends: <b>' + game.enemy.intent.label + '</b>. One more hit ends the duel…');
    render();
  }
})();
