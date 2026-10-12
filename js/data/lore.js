/* World story, delivered across the run rather than dumped up front. */
(function (global) {
  'use strict';
  const DC = global.DC;

  DC.LORE = {
    title: 'THE HOLLOW DEEP',
    subtitle: 'A roguelike descent',

    crawl: [
      'Aetherfall hung in the sky for nine hundred years,',
      'a city of taper-light, held up by nine seals.',
      'On the night the Archon Sevric tore a gate to the Emberdeep',
      'to bargain for his daughter\u2019s life, the seals went out one by one \u2014',
      'and the city fell straight down into the dark it had been keeping shut.',
      '',
      'The Order of the Taper has one delver left who can still hold a flame.',
      'That is you. Go down. Relight what you can. Find out what Sevric became.',
    ],

    fragments: [
      { depth: 3, text: 'The stair ends here and the floor begins, which is a way of saying the city stopped being a city about three floors down.' },
      { depth: 5, text: 'The first seal is out here somewhere. You can feel it the way you feel a draft in a sealed room \u2014 a place where the dark is being held back by something older than you.' },
      { depth: 10, text: 'Ash on the walls, packed thick as thatch. This was a stair, once. Whatever came up did not walk it \u2014 it poured.' },
      { depth: 13, text: 'A door in the wall with the hinge on the inside. Whoever shut it wanted to be on this side of it.' },
      { depth: 15, text: 'A Taper lantern, still warm. Someone burned their last oil down to the wick and then kept walking. You do the same, because that is the whole of the job.' },
      { depth: 20, text: 'Voices in the stone, nine of them, arguing in a language that has no living mouth for it. The second seal is close. So is whatever is guarding it.' },
      { depth: 23, text: 'Somebody has stacked their own broken gear in a neat pile at the foot of a stair. Delvers do that. It is not a ritual, it is just where you notice you are tired.' },
      { depth: 25, text: 'A child\u2019s drawing scratched into the rock: a city with roots. Underneath it, in a grown-up hand: \u201cshe woke up smiling\u201d.' },
      { depth: 30, text: 'The choir of Aetherfall sang the seals into being. Down here the same hymn comes back wrong \u2014 words intact, meaning inverted.' },
      { depth: 33, text: 'The demons here have started carrying torches. They do not need the light. They are keeping it out of your hands.' },
      { depth: 35, text: 'Demons do not build. They reuse. Every blade you find here was a citizen\u2019s blade before it was a demon\u2019s.' },
      { depth: 40, text: 'Sevric\u2019s ledger, pages fused into a brick. The last legible line: \u201cIt asked for something small. I gave it the city.\u201d' },
      { depth: 43, text: 'Nine hundred years, it turns out, is a number you can hear. It sounds like water in a room nobody has opened.' },
      { depth: 45, text: 'The deep is not a cave. It is a throat. Every level you cross is a swallow that has not finished happening.' },
      { depth: 50, text: 'You find the Archon\u2019s cloak folded neatly on a rock, empty, sized for something that no longer needs cloth.' },
      { depth: 60, text: 'The seals are not objects. They are wounds that were taught to hold. Down here, one of them is starting to open again.' },
      { depth: 70, text: 'A door with your own name on it, in your own handwriting. You do not touch it. You go around it. That is what keeps you you.' },
    ],

    // Boss roster, indexed by tier (depth / C.BOSS_EVERY, so one entry every
    // five floors). It is twelve deep because the cadence doubled -- the named
    // sovereigns now run out at depth 60 instead of depth 600. Beyond the
    // list, names are prefixed with an echo marker.
    bosses: [
      { name: 'VAURN, THE ASH HERALD', kind: 'knight', line: 'It wears the gatehouse like armour. Every step carries a door it swallowed.' },
      { name: 'SARNAEL THE NINE-VOICE', kind: 'mage', line: 'It speaks in the choir it ate. Each syllable is a different throat.' },
      { name: 'KESSILADE, BLADE OF THE CHOIR', kind: 'swordsman', line: 'Six hands, six swords, one very patient grudge against the living.' },
      { name: 'MORVAX, THE HOLLOW CROWN', kind: 'knight', line: 'The crown is fused to it. It is still, technically, a king.' },
      { name: 'THE TAPER THAT WEEPS', kind: 'mage', line: 'A lantern the size of a horse, and the wax is not wax. It has been burning something since before you were born.' },
      { name: 'GRIMM OF THE NINE DOORS', kind: 'swordsman', line: 'Nine doors, nine oaths, one mouth left to break them with. It counts you as the tenth.' },
      { name: 'THE CHOIR BELOW', kind: 'mage', line: 'It has no throat of its own. It borrows yours, briefly, and sings the note you were about to sing.' },
      { name: 'ASHVANE, THE SECOND HERALD', kind: 'swordsman', line: 'Vaurn had a sister. She kept the gatehouse ledger, and she has come to balance it.' },
      { name: 'THE UNMADE VESSEL', kind: 'knight', line: 'A reliquary with nothing inside but habit. It fights the way it lived: on command.' },
      { name: 'SEVRIC, THE FIRST SOVEREIGN', kind: 'mage', line: 'The Archon. Still bargaining. Still willing to pay with somebody else.' },
      { name: 'THE NINTH SEAL, UNMADE', kind: 'swordsman', line: 'The last taper, inverted. It does not want the light out \u2014 it wants the light to agree.' },
      { name: 'THE DEEP THAT REMEMBERS', kind: 'knight', line: 'It is wearing the last delver. Not his armour \u2014 him, folded into the shape of armour.' },
    ],

    echoPrefixes: ['Echo of', 'Second', 'Hollow', 'Ashen', 'Unquiet', 'Last'],
    echoNouns: ['the Drowned Choir', 'the Gate That Walks', 'Nine Throats', 'the Long Swallow', 'the Taper\u2019s End'],

    epitaphs: [
      { min: 0, text: 'You made it to the first landing. The dark barely noticed.' },
      { min: 5, text: 'You killed the first herald and got far enough to hear the seals humming. Not far enough to answer.' },
      { min: 10, text: 'Two of the deep\u2019s own are down. Somebody up there just stopped screaming in relief.' },
      { min: 20, text: 'Two seals relit, and a lantern left burning on a rock for the next one.' },
      { min: 30, text: 'The choir knows your name now. It sings it in the wrong key, but it knows it.' },
      { min: 40, text: 'You walked the throat of the deep for forty swallowings and made it flinch.' },
      { min: 50, text: 'You stood where Aetherfall landed. The crater still has your bootprints in it.' },
      { min: 70, text: 'Past the Archon, past the seals, past the point where the deep has a floor. Nobody has ever gone this far and come back to say so.' },
    ],

    classIntros: {
      mage: 'You are Ysolde the Wick-Keeper. You kept the ninth taper lit for eleven years with your own body heat. The Order called it a miracle; you called it a shift. You go down because a flame that never leaves a room learns nothing about the dark.',
      knight: 'You are Brann Hollowshield, and the shield is hollow because the thing that broke it is still inside it. You go slowly. You go anyway. That has always been the whole technique.',
    },

    merchantLines: [
      'Everything here came out of somebody else\u2019s run. I do not ask whose.',
      'Coin spends the same at any depth. That is the only fair thing down here.',
      'Buy. I get lonely between descents.',
      'You are the first one through in nine days. Prices went up. Sorry.',
    ],

    portalLine: 'The portal smells like the inside of a bell.',
  };
})(typeof window !== 'undefined' ? window : globalThis);
