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

  DC.levels.build = function (depth, rng) {
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
      const m = openTileNear(grid, startTx + rng.int(-4, 4), startTy - rng.int(2, 4), 6);
      world.merchant = DC.Props.merchant(tileCenter(m[0]), tileCenter(m[1]), rng, depth);
      const b = openTileNear(grid, G >> 1, G >> 1, 6);
      world.boss = DC.Boss.create(rng.pick(['knight', 'mage', 'swordsman']), tileCenter(b[0]), tileCenter(b[1]), depth, rng);
      world.portal = {
        x: tileCenter(b[0]), y: tileCenter(b[1]), tx: b[0], ty: b[1],
        active: false, discovered: false, anim: 0,
      };
      // A couple of comfort chests in the arena, plus the merchant.
      const chestTiles = spacedTiles(rng, world, 2, { minDistTiles: 4, minSep: 8 });
      for (let i = 0; i < chestTiles.length; i++) {
        const t = chestTiles[i];
        world.chests.push(DC.Props.chest(tileCenter(t % G), tileCenter((t - (t % G)) / G), rng, depth));
      }
    } else {
      let grid, tries = 0, s;
      do {
        grid = DC.Maze.generate(rng);
        const cells = Math.floor((G - 1) / 2);
        s = [rng.int(0, cells - 1) * 2 + 1, rng.int(0, cells - 1) * 2 + 1];
        tries++;
      } while (!DC.Maze.allReachable(grid, s[0], s[1]) && tries < 12);
      world = makeWorld(depth, grid, rng, isBoss);
      world.start = { tx: s[0], ty: s[1], x: tileCenter(s[0]), y: tileCenter(s[1]) };
      world.dist = DC.Maze.bfs(grid, s[0], s[1]).dist;

      // Portal at the BFS-farthest reachable tile: always reachable, always a
      // real journey to get to.
      let best = -1, bestT = -1;
      for (let i = 0; i < world.open.length; i++) {
        const t = world.open[i];
        if (world.dist[t] > best) { best = world.dist[t]; bestT = t; }
      }
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
        world.demons.push(DC.Demons.create(kind, tileCenter(t % G), tileCenter((t - (t % G)) / G), depth, rng));
      }

      const chestCount = Math.min(C.CHEST_MAX, Math.round(C.CHEST_BASE + C.CHEST_PER_DEPTH * depth));
      const cTiles = spacedTiles(rng, world, chestCount, { minDistTiles: 3, minSep: 5, avoid: nearPortal });
      for (let i = 0; i < cTiles.length; i++) {
        const t = cTiles[i];
        world.chests.push(DC.Props.chest(tileCenter(t % G), tileCenter((t - (t % G)) / G), rng, depth));
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
      demons: [], chests: [], projectiles: [], particles: [], floaters: [], drops: [],
      decor: [], seed: rng.s,
      flow: null, flowAt: 0,
      ambient: isBoss ? 'boss' : 'dungeon',
    };
    if (!isBoss) world.dist = new Int32Array(C.GRID * C.GRID).fill(0);
    else {
      const d = new Int32Array(C.GRID * C.GRID).fill(0);
      world.dist = d;
    }
    return world;
  }

  /* Visual-only clutter: rubble, bones, cracks, fallen lanterns, mushrooms. */
  function buildDecor(world, rng) {
    const out = [];
    const kinds = ['rubble', 'rubble', 'bones', 'crack', 'lantern', 'mushroom', 'chain', 'stump'];
    const want = world.isBoss ? 90 : 150;
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
    return out;
  }
})(typeof window !== 'undefined' ? window : globalThis);
