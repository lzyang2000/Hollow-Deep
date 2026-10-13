/* Level assembly: geometry, start, portal, decor, demons, chests, merchant. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const C = DC.C;
  const M = DC.M;

  // Regions, one per ten depths: the country a floor sits in. The floor itself
  // gets its own name (below), so a band is the subtitle, not the address.
  DC.DEPTH_BANDS = [
    'The Spill', 'Ash Stair', 'Lantern Warrens', 'The Weeping Gate', 'Choir Hollow',
    'Bone Tidal', 'The Long Swallow', 'Sevric\u2019s Foothold', 'The Unmade Seal',
  ];
  DC.depthBand = function (depth) {
    return DC.DEPTH_BANDS[Math.min(Math.floor((depth - 1) / 10), DC.DEPTH_BANDS.length - 1)];
  };

  /* Which look a floor wears. The band picks the region, and the variant walks
     the region's three tones in depth order, so ten floors in one country never
     repeat and two neighbouring floors never match. Pure function of depth: a
     save file rebuilds the floor it was wearing when it was written. */
  DC.themeFor = function (depth) {
    depth = Math.max(1, Math.floor(depth) || 1);
    const theme = DC.THEMES[Math.min(Math.floor((depth - 1) / 10), DC.THEMES.length - 1)];
    return { theme: theme, variant: (depth - 1) % theme.variants.length };
  };

  /* Every floor is a place with a name of its own, not "Depth 14". The words
     are drawn from the seed that drew the corridors, so a save file rebuilds
     the same floor under the same name, and no two runs read the same way.
     Boss floors draw from a heavier place-word pool: a throne room is not a
     Warren. */
  DC.FLOOR_WORDS = {
    adj: ['Ash', 'Weeping', 'Taper', 'Hollow', 'Drowned', 'Ember', 'Whispering', 'Bone',
      'Unquiet', 'Inverted', 'Salt', 'Cinder', 'Glass', 'Thorn', 'Pale', 'Rusted',
      'Mourning', 'Nine-Voice', 'Gatehouse', 'Choir', 'Lantern', 'Wounded', 'Wicking', 'Gravesong'],
    noun: ['Stair', 'Warren', 'Hollow', 'Gate', 'Choir', 'Swallow', 'Vault', 'Cistern',
      'Undercroft', 'Landing', 'Shaft', 'Cloister', 'Ossuary', 'Antechamber', 'Refectory',
      'Scriptorium', 'Belfry', 'Colonnade', 'Foundry', 'Reliquary'],
    bossNoun: ['Throne', 'Crown Hall', 'Judgement Hall', 'Seal Chamber', 'Assay Yard',
      'Throat', 'Nave', 'Barrow', 'Vessel', 'Marrow Hall'],
    of: ['the Drowned Choir', 'the Gate That Walks', 'Nine Doors', 'the Long Swallow',
      'the Taper\u2019s End', 'the Ninth Seal', 'the Archon', 'a City With Roots',
      'the Emberdeep', 'the Last Lantern', 'the Unmade', 'Nine Hundred Years'],
  };

  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

  /* The words come out of the region the floor sits in, so a Bone Ossuary is
     never a violet room and a Lantern Warren always has torches on it. The
     common pool still gets a third of the names -- a country that only ever
     names itself starts to sound like a menu. Throne rooms draw from the heavy
     pool no matter which region they sit in. */
  function composeFloorName(rng, isBoss, theme) {
    const W = DC.FLOOR_WORDS;
    const roll = rng.next();
    const local = !!(theme && !isBoss && rng.next() < 0.66);
    const noun = rng.pick(isBoss ? W.bossNoun : (local ? theme.noun : W.noun));
    const adj = rng.pick(local ? theme.adj : W.adj);
    let name;
    if (roll < 0.38) name = 'The ' + adj + ' ' + noun;
    else if (roll < 0.60) name = adj + ' ' + noun;
    else if (roll < 0.84) name = 'The ' + noun + ' of ' + rng.pick(W.of);
    else name = 'The ' + noun;
    /* A name has to survive the smallest place it is ever written: the pause
       line and the map title on a phone held upright. The draw shrinks the
       type rather than cut it off, but a name that has been shrunk to nothing
       stops being a name. So the longest pattern gives way to a shorter one
       when it would not fit, and the words it already chose stay the words. */
    if (name.length > 34) {
      const shorter = 'The ' + adj + ' ' + noun;
      name = shorter.length <= 34 ? shorter : adj + ' ' + noun;
    }
    return name;
  }

  // run seed -> { depth: name, used: { name: true } }
  const nameBook = new Map();

  DC.floorName = function (depth, levelSeed) {
    depth = Math.max(1, Math.floor(depth) || 1);
    /* A floor's seed is the run seed XOR a depth constant, and XOR undoes
       itself, so any one floor's seed names every floor above it. That is what
       lets a name be checked against the floors already named in this run. */
    const runSeed = (levelSeed ^ (depth * 0x9e3779b9)) >>> 0;
    let book = nameBook.get(runSeed);
    if (!book) {
      if (nameBook.size > 64) nameBook.clear();
      book = { used: Object.create(null) };
      nameBook.set(runSeed, book);
    }
    for (let d = 1; d <= depth; d++) {
      if (book[d]) continue;
      const sd = (runSeed ^ (d * 0x9e3779b9)) >>> 0;
      const rng = new DC.RNG((sd ^ 0x51ed2701) >>> 0);
      let name = composeFloorName(rng, d % C.BOSS_EVERY === 0, DC.themeFor(d).theme);
      /* Two floors with the same name stop being two places. A numeral keeps
         the answer independent of which floors happen to have been visited
         already -- a reroll would not be. */
      if (book.used[name]) {
        let k = 2;
        while (book.used[name + ' ' + (ROMAN[k] || k)] && (name + ' ' + (ROMAN[k] || k)).length <= 38) k++;
        name = name + ' ' + (ROMAN[k] || k);
      }
      book.used[name] = true;
      book[d] = name;
    }
    return book[depth];
  };

  DC.levelName = function (depth, levelSeed) {
    return 'Depth ' + depth + ' \u2014 ' +
      (levelSeed == null ? DC.depthBand(depth) : DC.floorName(depth, levelSeed));
  };

  // Which boss in the roster this depth gets.
  DC.bossTier = function (depth) { return Math.max(1, Math.round(depth / C.BOSS_EVERY)); };

  /* Below the ninth seal the deep stops inventing and starts reusing, so the
     whole Sovereign deck gets shuffled. The shuffle belongs to the run rather
     than to the floor: it comes out of the run seed, which means depth 63 has
     the same throne in it every time you come back, and a save file can prove
     it kept the right one. */
  DC.echoOrder = function (seed) {
    const n = DC.LORE.bosses.length;
    const order = [];
    for (let i = 0; i < n; i++) order.push(i);
    new DC.RNG((seed ^ 0x239bd1e7) >>> 0).shuffle(order);
    return order;
  };

  /* Which roster entry sits on a throne, and how many times the deck has been
     dealt to get there. The nine seals are the plot, so tiers 1..9 are never
     shuffled; past them the deck is dealt in echo order and every full pass
     through it deepens the marker on the name. */
  DC.bossEntry = function (tier, order) {
    const roster = DC.LORE.bosses.length;
    if (tier <= DC.LORE.sealCount) return { entry: DC.LORE.bosses[tier - 1], echoCycle: 0 };
    const o = Array.isArray(order) && order.length === roster ? order : DC.echoOrder(0);
    const k = tier - DC.LORE.sealCount - 1;
    return { entry: DC.LORE.bosses[o[k % roster]], echoCycle: Math.floor(k / roster) + 1 };
  };

  /* Nine seals, nine thrones, one every fifth floor: the first eight are
     numbered, the ninth says so out loud, and past the ninth there is nothing
     left holding the dark back. */
  const SEAL_NUMERAL = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
  DC.sealLabel = function (tier) {
    if (tier < 1 || tier > DC.LORE.sealCount) return null;
    return 'The ' + SEAL_NUMERAL[tier] + (tier === 1 ? 'st' : tier === 2 ? 'nd' : tier === 3 ? 'rd' : 'th') + ' seal';
  };

  function tileCenter(t) { return (t + 0.5) * C.TILE; }

  function openTileNear(grid, tx, ty, radius) {
    for (let r = 0; r <= radius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (r > 0 && Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const x = tx + dx, y = ty + dy;
          if (x > 0 && y > 0 && x < C.GRID - 1 && y < C.GRID - 1 && grid[y * C.GRID + x] === 1) return [x, y];
        }
      }
    }
    return [Math.floor(C.GRID / 2), Math.floor(C.GRID / 2)];
  }

  /* Greedy spaced sampling of open tiles. */
  function spacedTiles(rng, world, count, opts) {
    const o = opts || {};
    const minSep = o.minSep == null ? 2 : o.minSep;
    const cand = [];
    const dist = world.dist;
    const minTiles = o.minDistTiles == null ? Math.ceil(C.MIN_SPAWN_DIST / C.TILE) : o.minDistTiles;
    /* Walking distance is the honest measure -- it is how you actually get
       there -- but it is not the measure the player feels when a demon is
       standing twenty metres away in a straight line through a doorway. The
       enemy spawner asks for both. */
    const minStartM = o.minStartM || 0;
    for (let i = 0; i < world.open.length; i++) {
      const t = world.open[i];
      if (dist[t] < minTiles) continue;
      if (minStartM) {
        const sx = t % C.GRID, sy = (t - sx) / C.GRID;
        if (Math.hypot(tileCenter(sx) - world.start.x, tileCenter(sy) - world.start.y) < minStartM) continue;
      }
      if (o.avoid && o.avoid.length) {
        const tx = t % C.GRID, ty = (t - tx) / C.GRID;
        let skip = false;
        for (let k = 0; k < o.avoid.length; k++) {
          const a = o.avoid[k];
          if (Math.hypot(tx - a[0], ty - a[1]) < (a[2] || 0)) { skip = true; break; }
        }
        if (skip) continue;
      }
      cand.push(t);
    }
    rng.shuffle(cand);
    const out = [];
    const taken = new Set();
    const pass = function (sep) {
      for (let i = 0; i < cand.length && out.length < count; i++) {
        const t = cand[i];
        if (taken.has(t)) continue;
        const tx = t % C.GRID, ty = (t - tx) / C.GRID;
        let ok = true;
        for (let k = 0; k < out.length; k++) {
          const ox = out[k] % C.GRID, oy = (out[k] - ox) / C.GRID;
          if (Math.abs(ox - tx) < sep && Math.abs(oy - ty) < sep) { ok = false; break; }
        }
        if (ok) { out.push(t); taken.add(t); }
      }
    };
    pass(minSep);
    /* The first pass is a shuffled lottery, and on a 150 m floor there are
       only a few hundred walkable tiles -- so it can strand the last handful
       of demons against the spacing rule and quietly ship a floor with fewer
       than the depth asked for. Relax the spacing rather than underfill. */
    for (let sep = minSep - 1; sep >= 1 && out.length < count; sep--) pass(sep);
    return out;
  }

  DC.levels = {};

  DC.levels.build = function (depth, rng, player, echoOrder) {
    const levelSeed = rng.s >>> 0;   // before any geometry has eaten the stream
    const isBoss = depth % C.BOSS_EVERY === 0;
    const G = C.GRID;
    let world = null;

    if (isBoss) {
      /* A 50 m chamber, not the whole floor. You come down the stair at the
         south edge of it, the merchant is a few paces along that same edge,
         and the Sovereign stands at the centre of the room. The keepOut radii
         are chamber-sized now too: a 34 m no-pillar zone in a 50 m room is the
         whole room. */
      const R = DC.Maze.arenaRect();
      const mcx = (R.x0 + R.x1) >> 1, mcy = (R.y0 + R.y1) >> 1;
      const startTx = mcx, startTy = R.y1 - 1;
      const keepOut = [
        { x: tileCenter(startTx), y: tileCenter(startTy), r: 11 },
        { x: tileCenter(mcx), y: tileCenter(mcy), r: 13 },
      ];
      const grid = DC.Maze.arena(rng, keepOut);
      world = makeWorld(depth, grid, rng, isBoss, levelSeed);
      const s = openTileNear(grid, startTx, startTy, 4);
      world.start = { tx: s[0], ty: s[1], x: tileCenter(s[0]), y: tileCenter(s[1]) };
      // The chamber needs a real distance field too: spacedTiles filters by
      // walk distance from the start, and a zero-filled field rejects every
      // tile -- which is why the boss room used to spawn no chests at all.
      world.dist = DC.Maze.bfs(grid, s[0], s[1]).dist;
      const m = openTileNear(grid, startTx + rng.int(-3, 3), startTy - rng.int(1, 3), 4);
      world.merchant = DC.Props.merchant(tileCenter(m[0]), tileCenter(m[1]), rng, depth);
      const b = openTileNear(grid, mcx, mcy, 4);
      const tier = DC.bossTier(depth);
      const pick = DC.bossEntry(tier, echoOrder);
      world.boss = DC.Boss.create(pick.entry.kind, tileCenter(b[0]), tileCenter(b[1]), depth, rng, player, pick.entry, pick.echoCycle);
      world.portal = {
        x: tileCenter(b[0]), y: tileCenter(b[1]), tx: b[0], ty: b[1],
        active: false, discovered: false, anim: 0,
      };
      // A couple of comfort chests in the chamber, plus the merchant. The
      // chamber is a quarter the floor it used to be, so it holds a quarter
      // the pottery.
      const chestTiles = spacedTiles(rng, world, 3, { minDistTiles: 3, minSep: 6 });
      for (let i = 0; i < chestTiles.length; i++) {
        const t = chestTiles[i];
        world.chests.push(DC.Props.chest(tileCenter(t % G), tileCenter((t - (t % G)) / G), rng, depth));
      }
      const arenaUrns = spacedTiles(rng, world, 5, { minDistTiles: 2, minSep: 3 });
      for (let i = 0; i < arenaUrns.length; i++) {
        const t = arenaUrns[i];
        world.urns.push(DC.Props.urn(tileCenter(t % G), tileCenter((t - (t % G)) / G), rng, depth));
      }
    } else {
      let grid, s, gen, tries = 0;
      do {
        gen = DC.Maze.generate(rng);
        grid = gen.grid;
        s = gen.start;
        tries++;
      } while (!DC.Maze.allReachable(grid, s[0], s[1]) && tries < 12);
      world = makeWorld(depth, grid, rng, isBoss, levelSeed);
      world.rooms = gen.rooms;
      world.start = { tx: s[0], ty: s[1], x: tileCenter(s[0]), y: tileCenter(s[1]) };
      world.dist = DC.Maze.bfs(grid, s[0], s[1]).dist;

      // Portal placement: a reachable tile deep in the maze, but not the
      // absolute farthest one. A perfect maze's farthest tile is a 700m+
      // corridor slog; we take a tile around the 50th percentile of walking
      // distance instead, so every level is a real journey without being a
      // chore. Ties are broken at random so the gate sits somewhere different
      // each time.
      //
      // And it stands in the open. A portal wedged in a corridor, a doorway or
      // an alcove reads as scenery, is hard to see coming, and (with no
      // auto-enter) is easy to miss entirely -- so the tile must sit inside a
      // room with PORTAL_CLEAR_TILES of open floor all the way round. Wider
      // patches win the near-ties, because a gate in the middle of a room is
      // the one you can actually approach.
      let far = 0;
      for (let i = 0; i < world.open.length; i++) far = Math.max(far, world.dist[world.open[i]]);
      const target = Math.max(C.PORTAL_MIN_TILES, Math.round(far * C.PORTAL_FRACTION));

      const inRoom = function (tx, ty) {
        for (let i = 0; i < world.rooms.length; i++) {
          const r = world.rooms[i];
          if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return true;
        }
        return false;
      };
      const openRadius = function (tx, ty, maxR) { return DC.Maze.openRadius(grid, tx, ty, maxR); };

      let best = -1, bestT = -1, bestScore = Infinity;
      const pick = function (needRadius, mustRoom) {
        let t0 = -1, d0 = -1, s0 = Infinity;
        for (let i = 0; i < world.open.length; i++) {
          const t = world.open[i];
          const d = world.dist[t];
          if (d < C.PORTAL_MIN_TILES) continue;
          const tx = t % G, ty = (t - tx) / G;
          if (mustRoom && !inRoom(tx, ty)) continue;
          const rad = openRadius(tx, ty, needRadius);
          if (rad < needRadius) continue;
          const score = Math.abs(d - target) + rng.next() * 3 - rad * 0.4;
          if (score < s0) { s0 = score; t0 = t; d0 = d; }
        }
        return { t: t0, d: d0 };
      };
      // Relax in order, never past the point where a level would have no gate.
      const relax = [
        [C.PORTAL_CLEAR_TILES, true], [C.PORTAL_CLEAR_TILES, false],
        [1, true], [1, false], [0, false],
      ];
      for (let i = 0; i < relax.length && bestT < 0; i++) {
        const got = pick(relax[i][0], relax[i][1]);
        bestT = got.t; best = got.d;
      }
      if (bestT < 0) {
        for (let i = 0; i < world.open.length; i++) {
          const t = world.open[i];
          if (world.dist[t] > best) { best = world.dist[t]; bestT = t; }
        }
      }
      world.portalDistTiles = best;
      world.portal = {
        x: tileCenter(bestT % G), y: tileCenter((bestT - (bestT % G)) / G),
        tx: bestT % G, ty: (bestT - (bestT % G)) / G,
        active: true, discovered: false, anim: 0,
      };

      const nearPortal = [[world.portal.tx, world.portal.ty, 3]];
      const enemyCount = Math.min(C.ENEMY_MAX, Math.round(C.ENEMY_BASE + C.ENEMY_PER_DEPTH * depth));
      const eTiles = spacedTiles(rng, world, enemyCount, { minSep: 2, avoid: nearPortal, minStartM: C.MIN_SPAWN_DIST });
      const mix = DC.demonMix(depth);
      const totalW = mix.reduce((a, b) => a + b[1], 0);
      for (let i = 0; i < eTiles.length; i++) {
        const t = eTiles[i];
        let r = rng.next() * totalW, kind = mix[0][0];
        for (let k = 0; k < mix.length; k++) { r -= mix[k][1]; if (r <= 0) { kind = mix[k][0]; break; } }
        world.demons.push(DC.Demons.create(kind, tileCenter(t % G), tileCenter((t - (t % G)) / G), depth, rng, player));
      }

      const chestCount = Math.min(C.CHEST_MAX, Math.round(C.CHEST_BASE + C.CHEST_PER_DEPTH * depth));
      const cTiles = spacedTiles(rng, world, chestCount, { minDistTiles: 3, minSep: 5, avoid: nearPortal });
      for (let i = 0; i < cTiles.length; i++) {
        const t = cTiles[i];
        world.chests.push(DC.Props.chest(tileCenter(t % G), tileCenter((t - (t % G)) / G), rng, depth));
      }

      // Urns line the route: smashable, and mostly hold a little coin.
      const urnCount = Math.min(C.URN_MAX, Math.round(C.URN_BASE + C.URN_PER_DEPTH * depth));
      const uTiles = spacedTiles(rng, world, urnCount, { minDistTiles: 2, minSep: 3, avoid: nearPortal });
      for (let i = 0; i < uTiles.length; i++) {
        const t = uTiles[i];
        world.urns.push(DC.Props.urn(tileCenter(t % G), tileCenter((t - (t % G)) / G), rng, depth));
      }
    }

    world.decor = buildDecor(world, rng);
    world.banner = world.name;
    return world;
  };

  function makeWorld(depth, grid, rng, isBoss, levelSeed) {
    const world = {
      depth, isBoss, grid,
      name: DC.floorName(depth, levelSeed),
      band: DC.depthBand(depth),
      theme: null, themeId: null, variant: 0,
      discovered: new Uint8Array(C.GRID * C.GRID),
      open: DC.Maze.openTiles(grid),
      dist: null,
      start: null, portal: null, merchant: null, boss: null,
      demons: [], chests: [], urns: [], projectiles: [], particles: [], floaters: [], drops: [],
      rooms: null,
      decor: [], seed: rng.s,
      flow: null, flowAt: 0,
      awakeCount: 0,
      ambient: isBoss ? 'boss' : 'dungeon',
    };
    const tv = DC.themeFor(depth);
    world.theme = tv.theme;
    world.themeId = tv.theme.id;
    world.variant = tv.variant;
    if (!isBoss) world.dist = new Int32Array(C.GRID * C.GRID).fill(0);
    else {
      const d = new Int32Array(C.GRID * C.GRID).fill(0);
      world.dist = d;
    }
    return world;
  }

  /* Visual-only clutter: rubble, bones, cracks, fallen lanterns, mushrooms,
     cobwebs, skulls, braziers -- plus torches mounted on the walls that face
     the corridors, which is what makes a big room read as a room. */
  function buildDecor(world, rng) {
    const out = [];
    const th = world.theme || DC.THEMES[0];
    const kinds = th.decor;
    /* One signature per floor: the region's motif is scattered through this
       whole level and absent from the next one, which is what makes a floor
       feel like somewhere you were rather than something that loaded. */
    const motif = th.motifs[(world.variant || 0) % th.motifs.length];
    // Decor density, not a fixed pile: the floor is 4/9 the area it was.
    const want = world.isBoss ? 110 : 190;
    for (let i = 0; i < want; i++) {
      const t = rng.pick(world.open);
      const tx = t % C.GRID, ty = (t - tx) / C.GRID;
      const x = (tx + rng.range(0.15, 0.85)) * C.TILE;
      const y = (ty + rng.range(0.15, 0.85)) * C.TILE;
      out.push({
        x, y, kind: rng.next() < 0.26 ? motif : rng.pick(kinds),
        rot: rng.range(0, Math.PI * 2), scale: rng.range(0.7, 1.4),
        tint: rng.next(),
      });
    }

    // Room dressing: each chamber gets its own little pile of the dead, so a
    // wide open space reads as a room even in torchlight.
    if (world.rooms) {
      const roomKinds = th.room;
      for (let i = 0; i < world.rooms.length; i++) {
        const rm = world.rooms[i];
        const n = rng.int(3, 7);
        for (let k = 0; k < n; k++) {
          const x = rng.range(rm.x + 0.6, rm.x + rm.w - 0.6);
          const y = rng.range(rm.y + 0.6, rm.y + rm.h - 0.6);
          if (world.grid[Math.floor(y) * C.GRID + Math.floor(x)] !== 1) continue;
          out.push({
            x: x * C.TILE + rng.range(0.4, 1.6), y: y * C.TILE + rng.range(0.4, 1.6),
            kind: rng.pick(roomKinds), rot: rng.range(0, Math.PI * 2),
            scale: rng.range(0.8, 1.6), tint: rng.next(),
          });
        }
      }
    }

    // Wall torches: a wall tile with open floor in front of it.
    const G = C.GRID, disc = null;
    const sconces = world.isBoss ? 26 : 44;
    const cand = [];
    for (let y = 1; y < G - 1; y++) {
      for (let x = 1; x < G - 1; x++) {
        if (world.grid[y * G + x] !== 0) continue;
        for (let d = 0; d < 4; d++) {
          const nx = x + DC.Maze.DIRS[d][0], ny = y + DC.Maze.DIRS[d][1];
          if (nx > 0 && ny > 0 && nx < G - 1 && ny < G - 1 && world.grid[ny * G + nx] === 1) {
            cand.push([x, y, d]);
            break;
          }
        }
      }
    }
    rng.shuffle(cand);
    for (let i = 0; i < cand.length && i < sconces; i++) {
      const x = cand[i][0], y = cand[i][1], d = cand[i][2];
      out.push({
        x: (x + 0.5) * C.TILE, y: (y + 0.5) * C.TILE, kind: 'sconce',
        rot: 0, dir: d, scale: rng.range(0.9, 1.15), tint: rng.next(), wall: true,
      });
    }
    return out;
  }
})(typeof window !== 'undefined' ? window : globalThis);
