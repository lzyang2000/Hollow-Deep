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
      { depth: 46, text: 'Nine thrones behind you and nine seals put back by hand. The stair keeps going anyway, which tells you the seals were never the bottom of the thing.' },
      { depth: 50, text: 'You find the Archon\u2019s cloak folded neatly on a rock, empty, sized for something that no longer needs cloth.' },
      { depth: 60, text: 'The seals are not objects. They are wounds that were taught to hold. Down here, one of them is starting to open again.' },
      { depth: 70, text: 'A door with your own name on it, in your own handwriting. You do not touch it. You go around it. That is what keeps you you.' },
    ],

    /* Aetherfall was held up by nine seals, and a Sovereign sits on each one,
       so the nine thrones are at depths 5, 10 ... 45. That is the story's
       shape, not the run's: the deep goes on under the last seal, and the
       roster keeps cycling with an echo marker past depth 60. */
    sealCount: 9,

    // Boss roster, indexed by tier (depth / C.BOSS_EVERY, so one entry every
    // five floors). The first nine entries are the nine seals and they stand
    // in story order: depth 5 is Vaurn, depth 45 is the Ninth Seal, and no
    // shuffle touches them, because that is the plot.
    //
    // Entries 10 to 12 are not thrones at all -- they are what is left down
    // there after the seals are all out. Below depth 45 the whole twelve-card
    // deck is shuffled per run (DC.echoOrder) and dealt again, and every pass
    // through it wears a deeper echo marker: ECHO OF, then SECOND, then
    // HOLLOW. Same seed, same sequence of thrones, so a save file still knows
    // who was waiting for it on depth 63.
    //
    // Each entry also carries its own score, which is what plays the moment
    // the throne room door opens: `bpm` and `key` (semitones off the depth's
    // own root), `prog` (which chord progression), `mode` (the mood -- see
    // MODES in js/core/audio.js), `motif` (the eight scale degrees its melody
    // walks), `lead` (plucked string, bell, bowed saw, or a pair of reeds),
    // `drums` (march / war / pulse / triplet / slow / still) and `accent` (the
    // one instrument that belongs only to it: an anvil, a choir, a roar, a
    // bow, a bell). Twelve Sovereigns, twelve tempos, no two alike -- and an
    // echo of a Sovereign comes back wearing the music it had.
    bosses: [
      { name: 'VAURN, THE ASH HERALD', kind: 'knight', line: 'It wears the gatehouse like armour. Every step carries a door it swallowed.',
        music: { bpm: 84, key: -3, prog: 0, mode: 'phrygian', motif: [0, 0, 3, 2, 0, -1, 0, 3], lead: 'saw', drums: 'march', accent: 'anvil' } },
      { name: 'SARNAEL THE NINE-VOICE', kind: 'mage', line: 'It speaks in the choir it ate. Each syllable is a different throat.',
        music: { bpm: 126, key: 5, prog: 1, mode: 'harmonic', motif: [0, 2, 4, 6, 4, 2, 7, 4], lead: 'bell', drums: 'pulse', accent: 'choir' } },
      { name: 'KESSILADE, BLADE OF THE CHOIR', kind: 'swordsman', line: 'Six hands, six swords, one very patient grudge against the living.',
        music: { bpm: 108, key: 2, prog: 3, mode: 'minor', motif: [0, 3, 2, 5, 4, 2, 6, 0], lead: 'pluck', drums: 'triplet', accent: 'strings' } },
      { name: 'MORVAX, THE HOLLOW CROWN', kind: 'knight', line: 'The crown is fused to it. It is still, technically, a king.',
        music: { bpm: 92, key: -5, prog: 2, mode: 'dorian', motif: [0, 4, 3, 0, 5, 4, 2, 0], lead: 'reeds', drums: 'march', accent: 'roar' } },
      { name: 'THE TAPER THAT WEEPS', kind: 'mage', line: 'A lantern the size of a horse, and the wax is not wax. It has been burning something since before you were born.',
        music: { bpm: 76, key: 7, prog: 1, mode: 'phrygian', motif: [0, -1, 3, 2, 0, 4, 3, 0], lead: 'bell', drums: 'slow', accent: 'choir' } },
      { name: 'GRIMM OF THE NINE DOORS', kind: 'swordsman', line: 'Nine doors, nine oaths, one mouth left to break them with. It counts you as the tenth.',
        music: { bpm: 100, key: 0, prog: 0, mode: 'minor', motif: [0, 2, 3, 5, 3, 2, 0, -2], lead: 'pluck', drums: 'war', accent: 'anvil' } },
      { name: 'THE CHOIR BELOW', kind: 'mage', line: 'It has no throat of its own. It borrows yours, briefly, and sings the note you were about to sing.',
        music: { bpm: 118, key: 9, prog: 2, mode: 'harmonic', motif: [6, 4, 2, 0, 2, 4, 6, 7], lead: 'reeds', drums: 'triplet', accent: 'choir' } },
      { name: 'ASHVANE, THE SECOND HERALD', kind: 'swordsman', line: 'Vaurn had a sister. She kept the gatehouse ledger, and she has come to balance it.',
        music: { bpm: 112, key: -1, prog: 3, mode: 'dorian', motif: [0, 0, 4, 2, 6, 4, 2, 2], lead: 'saw', drums: 'pulse', accent: 'strings' } },
      { name: 'THE NINTH SEAL, UNMADE', kind: 'swordsman', line: 'The last taper, inverted. It does not want the light out \u2014 it wants the light to agree.',
        music: { bpm: 96, key: 4, prog: 2, mode: 'harmonic', motif: [0, 1, 3, 2, 0, -1, 1, 0], lead: 'bell', drums: 'war', accent: 'roar' } },
      { name: 'SEVRIC, THE FIRST SOVEREIGN', kind: 'mage', line: 'The Archon. Still bargaining. Still willing to pay with somebody else.',
        music: { bpm: 120, key: 3, prog: 1, mode: 'harmonic', motif: [0, 4, 2, 6, 4, 7, 6, 4], lead: 'saw', drums: 'pulse', accent: 'choir' } },
      { name: 'THE UNMADE VESSEL', kind: 'knight', line: 'A reliquary with nothing inside but habit. It fights the way it lived: on command.',
        music: { bpm: 88, key: -4, prog: 0, mode: 'phrygian', motif: [0, 0, 0, 3, 0, 0, 5, 3], lead: 'reeds', drums: 'march', accent: 'anvil' } },
      { name: 'THE DEEP THAT REMEMBERS', kind: 'knight', line: 'It is wearing the last delver. Not his armour \u2014 him, folded into the shape of armour.',
        music: { bpm: 72, key: -2, prog: 3, mode: 'locrian', motif: [0, 3, 1, 4, 3, 1, 0, -1], lead: 'bell', drums: 'still', accent: 'roar' } },
    ],

    /* The ninth seal is the story's last door. Killing what sat on it does not
       end the run, it ends the *story*, and then asks whether the deep is
       finished for you. Six cards, one click each, each with a vector scene
       drawn by DC.UI.endingArt -- no image files anywhere in this game. */
    ending: [
      { art: 'fall', title: 'THE NINTH SEAL IS DOWN',
        text: 'The last taper goes out in your hand and the whole deep exhales. Nine hundred years of held breath, leaving through a wound you made with a sword.' },
      { art: 'seals', title: 'NINE, PUT BACK BY HAND',
        text: 'No choir sang these back into place. You lit them one at a time, in the wrong order, out of gear you took off demons. That is not how the hymn goes. It worked anyway.' },
      { art: 'crown', title: 'WHAT SEVRIC BECAME',
        text: 'The Archon is not down here. There is no bargain left to make and nobody left to pay with. The Order never wrote this part: the deep does not want anything from you. It only keeps what it is given.' },
      { art: 'tapers', title: 'THE CITY IS NOT UP THERE',
        text: 'Aetherfall did not break when it fell. It grew down. Every floor you crossed was a street that learned to swallow, and every Sovereign was a citizen who got good at it.' },
      { art: 'throat', title: 'THE STAIR KEEPS GOING',
        text: 'Below the ninth seal the deep runs out of names and starts reusing them. The thrones down there are echoes, and an echo is not weaker than the thing it came from. It has had longer to practise.' },
      { art: 'stair', title: 'YOU ARE STILL HOLDING A FLAME',
        text: 'The Order sent one delver down and expects one report. You can carry that report up right now, with nine seals relit behind you. Or you can keep going, which is what the flame was ever actually for.' },
    ],

    // What the two doors on the choice screen say, and what the climb out is
    // worth. The deep keeps a record either way.
    endingChoice: 'Nine seals are out and none of them are dark. The stair goes down and the stair goes up, and only one of them is still yours to take.',
    deeperLine: 'You step back onto depth 45 with the report you did not write. The merchant is still there. He does not look up.',
    retireLine: 'You came back up. Nine seals relit by hand, a city that is still a crater, and a report nobody in the Order wants to read out loud. You kept the flame lit and you walked out holding it. That was the whole job.',

    echoPrefixes: ['Echo of', 'Second', 'Hollow', 'Ashen', 'Unquiet', 'Last'],
    echoNouns: ['the Drowned Choir', 'the Gate That Walks', 'Nine Throats', 'the Long Swallow', 'the Taper\u2019s End'],

    epitaphs: [
      { min: 0, text: 'You made it to the first landing. The dark barely noticed.' },
      { min: 5, text: 'You killed the first herald and got far enough to hear the seals humming. Not far enough to answer.' },
      { min: 10, text: 'Two of the deep\u2019s own are down. Somebody up there just stopped screaming in relief.' },
      { min: 20, text: 'Two seals relit, and a lantern left burning on a rock for the next one.' },
      { min: 30, text: 'The choir knows your name now. It sings it in the wrong key, but it knows it.' },
      { min: 40, text: 'You walked the throat of the deep for forty swallowings and made it flinch.' },
      { min: 46, text: 'Nine seals out, and you kept going anyway. The deep had to put something new in your way, and it did, and it finished you. That is not a loss, it is arithmetic.' },
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

  /* Nine regions, one per ten depths, in the order of DC.DEPTH_BANDS. A region
     is a look as well as a name: the stone, the colour of the dark, the colour
     every torch on the floor burns, and the litter underfoot all come out of
     the same entry, so Bone Tidal is never a violet room.

     A band is ten floors long, so each region carries three tonal variants and
     the variant walks in order with depth: two neighbouring floors never wear
     the same one, and the country stays recognisable. `motifs` is the same
     idea one level finer -- one signature prop, scattered through the whole
     level, that the next level does not have.

     Everything is a pure function of depth, so a save file rebuilds the floor
     it was wearing when it was written. */
  DC.THEMES = [
    {
      id: 'spill', label: 'The Spill',
      night: '#05070a', fog: [5, 7, 10],
      base: { floor: '#3d536c', floor2: '#35495f', wall: '#1b232c', wallTop: '#2a3746', edge: '#7790ab' },
      variants: [
        { d: 1.00, glow: '#6ea8ff', flame: '#ff9e42' },
        { d: 1.12, glow: '#8ecbff', flame: '#9ed2ff' },
        { d: 0.88, glow: '#5b8ad0', flame: '#ffcf8a' },
      ],
      decor: ['rubble', 'rubble', 'debris', 'bones', 'skull', 'crack', 'lantern', 'puddle', 'puddle', 'chain', 'mushroom', 'web'],
      room: ['bones', 'skull', 'skull', 'puddle', 'chain', 'crack', 'mushroom', 'debris'],
      motifs: ['puddle', 'chain', 'lantern'],
      adj: ['Weeping', 'Drowned', 'Salt', 'Wicking', 'Taper', 'Gatehouse'],
      noun: ['Stair', 'Cistern', 'Undercroft', 'Landing', 'Shaft', 'Colonnade'],
    },
    {
      id: 'ash', label: 'Ash Stair',
      night: '#0a0706', fog: [9, 7, 6],
      base: { floor: '#7a5e52', floor2: '#6e5449', wall: '#3f322c', wallTop: '#57453d', edge: '#b39d94' },
      variants: [
        { d: 1.00, glow: '#ffc48a', flame: '#ffb066' },
        { d: 1.10, glow: '#e8e0d0', flame: '#ffd9a0' },
        { d: 0.86, glow: '#d99a5e', flame: '#ff8f4a' },
      ],
      decor: ['ashpile', 'ashpile', 'ashpile', 'rubble', 'debris', 'bones', 'skull', 'crack', 'stump', 'lantern', 'web', 'mushroom'],
      room: ['ashpile', 'ashpile', 'bones', 'skull', 'stump', 'crack', 'debris', 'rubble'],
      motifs: ['ashpile', 'stump', 'bones'],
      adj: ['Ash', 'Cinder', 'Unquiet', 'Wounded', 'Gravesong', 'Ember'],
      noun: ['Stair', 'Warren', 'Undercroft', 'Refectory', 'Scriptorium', 'Landing'],
    },
    {
      id: 'lantern', label: 'Lantern Warrens',
      night: '#0c0804', fog: [11, 8, 4],
      base: { floor: '#604a29', floor2: '#523f23', wall: '#1b160d', wallTop: '#372c1a', edge: '#ad8b58' },
      variants: [
        { d: 1.00, glow: '#ffd166', flame: '#ffb347' },
        { d: 1.10, glow: '#ffe9a8', flame: '#ffd166' },
        { d: 0.87, glow: '#e0a63f', flame: '#ff8c2e' },
      ],
      decor: ['lantern', 'lantern', 'lantern', 'brazier', 'debris', 'rubble', 'crack', 'bones', 'chain', 'ashpile', 'web', 'skull'],
      room: ['lantern', 'lantern', 'brazier', 'chain', 'crack', 'skull', 'debris', 'ashpile'],
      motifs: ['lantern', 'brazier', 'chain'],
      adj: ['Lantern', 'Taper', 'Wicking', 'Nine-Voice', 'Mournful', 'Ember'],
      noun: ['Warren', 'Belfry', 'Cloister', 'Refectory', 'Antechamber', 'Landing'],
    },
    {
      id: 'gate', label: 'The Weeping Gate',
      night: '#040b0b', fog: [4, 11, 11],
      base: { floor: '#244c4b', floor2: '#1d3e3d', wall: '#070d0d', wallTop: '#132525', edge: '#519997' },
      variants: [
        { d: 1.00, glow: '#7fe0d0', flame: '#7fe0d0' },
        { d: 1.12, glow: '#a8f0e6', flame: '#9ee8ff' },
        { d: 0.86, glow: '#5cb8ad', flame: '#66c8ff' },
      ],
      decor: ['puddle', 'puddle', 'puddle', 'chain', 'chain', 'crack', 'rubble', 'bones', 'skull', 'mushroom', 'web', 'debris'],
      room: ['puddle', 'puddle', 'chain', 'chain', 'crack', 'bones', 'skull', 'debris'],
      motifs: ['chain', 'puddle', 'crack'],
      adj: ['Weeping', 'Inverted', 'Salt', 'Drowned', 'Wounded', 'Gatehouse'],
      noun: ['Gate', 'Colonnade', 'Cistern', 'Shaft', 'Undercroft', 'Antechamber'],
    },
    {
      id: 'choir', label: 'Choir Hollow',
      night: '#08040b', fog: [8, 4, 11],
      base: { floor: '#51336c', floor2: '#472c5e', wall: '#1f1528', wallTop: '#342244', edge: '#8f69af' },
      variants: [
        { d: 1.00, glow: '#c79bff', flame: '#c79bff' },
        { d: 1.10, glow: '#e0c4ff', flame: '#ffb3e6' },
        { d: 0.87, glow: '#9a72d6', flame: '#a98cff' },
      ],
      decor: ['rune', 'rune', 'rune', 'banner', 'crack', 'bones', 'skull', 'web', 'lantern', 'debris', 'rubble', 'mushroom'],
      room: ['rune', 'rune', 'banner', 'web', 'skull', 'crack', 'bones', 'lantern'],
      motifs: ['rune', 'banner', 'web'],
      adj: ['Choir', 'Nine-Voice', 'Whispering', 'Pale', 'Mourning', 'Hollow'],
      noun: ['Choir', 'Cloister', 'Scriptorium', 'Belfry', 'Reliquary', 'Colonnade'],
    },
    {
      id: 'bone', label: 'Bone Tidal',
      night: '#0a0905', fog: [10, 9, 5],
      base: { floor: '#948857', floor2: '#877c4f', wall: '#544e36', wallTop: '#6e6644', edge: '#c3bda2' },
      variants: [
        { d: 1.00, glow: '#eae4c8', flame: '#ffe6a8' },
        { d: 1.08, glow: '#f6f0dc', flame: '#ffd166' },
        { d: 0.88, glow: '#c9bf9c', flame: '#e8b878' },
      ],
      decor: ['ribcage', 'ribcage', 'skull', 'skull', 'bones', 'bones', 'crack', 'rubble', 'ashpile', 'stump', 'web', 'debris'],
      room: ['ribcage', 'skull', 'skull', 'bones', 'bones', 'crack', 'ashpile', 'stump'],
      motifs: ['ribcage', 'skull', 'bones'],
      adj: ['Bone', 'Gravesong', 'Pale', 'Unquiet', 'Salt', 'Wounded'],
      noun: ['Ossuary', 'Cistern', 'Vault', 'Undercroft', 'Reliquary', 'Landing'],
    },
    {
      id: 'swallow', label: 'The Long Swallow',
      night: '#0c0404', fog: [11, 4, 5],
      base: { floor: '#522328', floor2: '#441d21', wall: '#0e0707', wallTop: '#2a1416', edge: '#a14f57' },
      variants: [
        { d: 1.00, glow: '#ff7a6a', flame: '#ff6a4a' },
        { d: 1.10, glow: '#ffa892', flame: '#ff9466' },
        { d: 0.86, glow: '#d9564a', flame: '#e8503a' },
      ],
      decor: ['banner', 'banner', 'crack', 'crack', 'bones', 'skull', 'debris', 'rubble', 'brazier', 'chain', 'ashpile', 'web'],
      room: ['banner', 'banner', 'brazier', 'crack', 'crack', 'bones', 'skull', 'chain'],
      motifs: ['banner', 'brazier', 'crack'],
      adj: ['Long', 'Rusted', 'Inverted', 'Ember', 'Unquiet', 'Swallowing'],
      noun: ['Passage', 'Shaft', 'Vault', 'Antechamber', 'Foundry', 'Colonnade'],
    },
    {
      id: 'foothold', label: 'Sevric\u2019s Foothold',
      night: '#060709', fog: [6, 7, 9],
      base: { floor: '#2a2d3c', floor2: '#222430', wall: '#09090c', wallTop: '#13151a', edge: '#606580' },
      variants: [
        { d: 1.00, glow: '#ff9440', flame: '#ff7a2e' },
        { d: 1.10, glow: '#c8d0dc', flame: '#ffb066' },
        { d: 0.87, glow: '#e07a2a', flame: '#ff5f2a' },
      ],
      decor: ['debris', 'debris', 'debris', 'rubble', 'rubble', 'crack', 'brazier', 'chain', 'banner', 'ashpile', 'bones', 'skull'],
      room: ['debris', 'debris', 'brazier', 'banner', 'chain', 'crack', 'rubble', 'bones'],
      motifs: ['debris', 'brazier', 'banner'],
      adj: ['Rusted', 'Wounded', 'Iron', 'Waking', 'Ember', 'Gatehouse'],
      noun: ['Foundry', 'Assay', 'Colonnade', 'Vault', 'Gate', 'Scriptorium'],
    },
    {
      id: 'seal', label: 'The Unmade Seal',
      night: '#040b07', fog: [5, 11, 7],
      base: { floor: '#20412e', floor2: '#193324', wall: '#070d0a', wallTop: '#0e1b13', edge: '#4e8d68' },
      variants: [
        { d: 1.00, glow: '#8ef0c0', flame: '#8ef0c0' },
        { d: 1.12, glow: '#c0ffe4', flame: '#a8ffd8' },
        { d: 0.86, glow: '#5fc49c', flame: '#66d8b0' },
      ],
      decor: ['crystal', 'crystal', 'crystal', 'rune', 'rune', 'crack', 'crack', 'bones', 'skull', 'debris', 'puddle', 'web'],
      room: ['crystal', 'crystal', 'rune', 'rune', 'crack', 'puddle', 'bones', 'skull'],
      motifs: ['crystal', 'rune', 'puddle'],
      adj: ['Unmade', 'Inverted', 'Nine-Voice', 'Hollow', 'Pale', 'Last'],
      noun: ['Seal', 'Chancel', 'Reliquary', 'Scriptorium', 'Cloister', 'Shaft'],
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
