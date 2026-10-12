/* Level assembly: geometry, start, portal, decor, demons, chests, merchant. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const C = DC.C;
  const M = DC.M;

  DC.DEPTH_BANDS = [
    'The Spill', 'Ash Stair', 'Lantern Warrens', 'The Weeping Gate', 'Choir Hollow',
    'Bone Tidal', 'The Long Swallow', 'Sevric\u2019s Foothold', 'The Unmade Seal',
  ];

  DC.levelName = function (depth) {
    const band = DC.DEPTH_BANDS[Math.min(Math.floor((depth - 1) / 10), DC.DEPTH_BANDS.length - 1)];
    return 'Depth ' + depth + ' \u2014 ' + band;
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
    for (let i = 0; i < world.open.length; i++) {
      const t = world.open[i];
      if (dist[t] < minTiles) continue;
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
    for (let i = 0; i < cand.length && out.length < count; i++) {
      const t = cand[i];
      const tx = t % C.GRID, ty = (t - tx) / C.GRID;
      let ok = true;
      for (let k = 0; k < out.length; k++) {
        const ox = out[k] % C.GRID, oy = (out[k] - ox) / C.GRID;
        if (Math.abs(ox - tx) < minSep && Math.abs(oy - ty) < minSep) { ok = false; break; }
      }
      if (ok) out.push(t);
    }
    return out;
  }

  DC.levels = {};

  DC.levels.build = function (depth, rng, player) {
    const isBoss = depth % 10 === 0;
    const G = C.GRID;
    let world = null;

    if (isBoss) {
      const startTx = (G >> 1), startTy = G - 7;
      const keepOut = [
        { x: tileCenter(startTx), y: tileCenter(startTy), r: 34 },
        { x: C.WORLD_M / 2, y: C.WORLD_M / 2, r: 40 },
      ];
      const grid = DC.Maze.arena(rng, keepOut);
      world = makeWorld(depth, grid, rng, isBoss);
      const s = openTileNear(grid, startTx, startTy, 6);
      world.start = { tx: s[0], ty: s[1], x: tileCenter(s[0]), y: tileCenter(s[1]) };
      // The arena needs a real distance field too: spacedTiles filters by walk
      // distance from the start, and a zero-filled field rejects every tile --
      // which is why the boss room used to spawn no chests at all.
      world.dist = DC.Maze.bfs(grid, s[0], s[1]).dist;
      const m = openTileNear(grid, startTx + rng.int(-4, 4), startTy - rng.int(2, 4), 6);
      world.merchant = DC.Props.merchant(tileCenter(m[0]), tileCenter(m[1]), rng, depth);
      const b = openTileNear(grid, G >> 1, G >> 1, 6);
      const tier = Math.max(1, Math.round(depth / 10));
      const entry = DC.LORE.bosses[(tier - 1) % DC.LORE.bosses.length];
      world.boss = DC.Boss.create(entry.kind, tileCenter(b[0]), tileCenter(b[1]), depth, rng, player, entry);
      world.portal = {
        x: tileCenter(b[0]), y: tileCenter(b[1]), tx: b[0], ty: b[1],
        active: false, discovered: false, anim: 0,
      };
      // A couple of comfort chests in the arena, plus the merchant.
      const chestTiles = spacedTiles(rng, world, 4, { minDistTiles: 4, minSep: 8 });
      for (let i = 0; i < chestTiles.length; i++) {
        const t = chestTiles[i];
        world.chests.push(DC.Props.chest(tileCenter(t % G), tileCenter((t - (t % G)) / G), rng, depth));
      }
      const arenaUrns = spacedTiles(rng, world, 8, { minDistTiles: 3, minSep: 4 });
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
      world = makeWorld(depth, grid, rng, isBoss);
      world.rooms = gen.rooms;
      world.start = { tx: s[0], ty: s[1], x: tileCenter(s[0]), y: tileCenter(s[1]) };
      world.dist = DC.Maze.bfs(grid, s[0], s[1]).dist;

      // Portal placement: a reachable tile deep in the maze, but not the
      // absolute farthest one. A perfect maze's farthest tile is a 700m+
      // corridor slog; we take a tile around the 62nd percentile of walking
      // distance instead, so every level is a real journey without being a
      // chore. Ties are broken at random so the gate sits somewhere different
      // each time.
      let far = 0;
      for (let i = 0; i < world.open.length; i++) far = Math.max(far, world.dist[world.open[i]]);
      const target = Math.max(C.PORTAL_MIN_TILES, Math.round(far * C.PORTAL_FRACTION));
      let best = -1, bestT = -1, bestScore = Infinity;
      for (let i = 0; i < world.open.length; i++) {
        const t = world.open[i];
        const d = world.dist[t];
        if (d < C.PORTAL_MIN_TILES) continue;
        const score = Math.abs(d - target) + rng.next() * 3;
        if (score < bestScore) { bestScore = score; bestT = t; best = d; }
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
      const eTiles = spacedTiles(rng, world, enemyCount, { minSep: 2, avoid: nearPortal });
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
    world.banner = DC.levelName(depth);
    return world;
  };

  function makeWorld(depth, grid, rng, isBoss) {
    const world = {
      depth, isBoss, grid,
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
    const kinds = ['rubble', 'rubble', 'debris', 'bones', 'skull', 'crack', 'lantern',
      'mushroom', 'chain', 'stump', 'web', 'web', 'brazier'];
    const want = world.isBoss ? 170 : 300;
    for (let i = 0; i < want; i++) {
      const t = rng.pick(world.open);
      const tx = t % C.GRID, ty = (t - tx) / C.GRID;
      const x = (tx + rng.range(0.15, 0.85)) * C.TILE;
      const y = (ty + rng.range(0.15, 0.85)) * C.TILE;
      out.push({
        x, y, kind: rng.pick(kinds),
        rot: rng.range(0, Math.PI * 2), scale: rng.range(0.7, 1.4),
        tint: rng.next(),
      });
    }

    // Room dressing: each chamber gets its own little pile of the dead, so a
    // wide open space reads as a room even in torchlight.
    if (world.rooms) {
      const roomKinds = ['bones', 'skull', 'skull', 'brazier', 'chain', 'crack', 'mushroom', 'debris'];
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
