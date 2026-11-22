/* Emberfall Duel — card definitions and the starting deck.
   Every card is original to this game: names, art glyphs and effects. */
'use strict';

/* A card: id, name, cost (energy), suit, suit class, art glyph, text and effect.
   effect kinds: damage, block, heal, draw, burn (damage now + burn over time). */
const CARD_DEFS = {
  strike: { id: 'strike', name: 'Ember Strike', cost: 1, suit: '♦', suitClass: 'suit-red', art: '⚔️', text: 'Deal <b>6</b> damage.' },
  cleave: { id: 'cleave', name: 'Cinder Cleave', cost: 2, suit: '♠', suitClass: 'suit-gold', art: '🪓', text: 'Deal <b>11</b> damage.' },
  guard: { id: 'guard', name: 'Ashen Guard', cost: 1, suit: '♣', suitClass: 'suit-blue', art: '🛡️', text: 'Gain <b>8</b> block.' },
  mend: { id: 'mend', name: 'Kindle Mend', cost: 1, suit: '♥', suitClass: 'suit-green', art: '💚', text: 'Heal <b>6</b> HP.' },
  ember: { id: 'ember', name: 'Burning Ember', cost: 1, suit: '♦', suitClass: 'suit-red', art: '🔥', text: 'Deal <b>4</b> damage and apply <b>Burn 3</b>.' },
  focus: { id: 'focus', name: 'Spark Focus', cost: 0, suit: '♣', suitClass: 'suit-blue', art: '✦', text: 'Draw <b>2</b> cards.' },
};

const CARD_EFFECTS = {
  strike: { damage: 6 },
  cleave: { damage: 11 },
  guard: { block: 8 },
  mend: { heal: 6 },
  ember: { damage: 4, burn: 3 },
  focus: { draw: 2 },
};

/* The starting deck: 20 cards, shuffled at the start of each duel. */
const STARTING_DECK = [
  'strike', 'strike', 'strike', 'strike', 'strike',
  'cleave', 'cleave', 'cleave',
  'guard', 'guard', 'guard', 'guard',
  'mend', 'mend', 'mend',
  'ember', 'ember', 'ember',
  'focus', 'focus',
];

function buildDeck() {
  return STARTING_DECK.map(function (id, i) {
    return { uid: 'c' + i + '-' + id, defId: id };
  });
}

function cardDef(card) { return CARD_DEFS[card.defId]; }
function cardEffect(card) { return CARD_EFFECTS[card.defId]; }
