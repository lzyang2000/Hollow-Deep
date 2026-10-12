/* Procedural level geometry.

   Normal levels: a recursive-backtracker maze on a 29x29 cell lattice, then
   braided (dead ends removed) and looped so it reads as a dungeon rather than
   a hairball. Boss levels: one open arena with a few pillars.

   Invariants enforced here and asserted by tmp/test_core.js:
     - border ring is always solid
     - every open tile is reachable from every other open tile
*/
(function (global) {
  'use strict';
  const DC = global.DC;
  const C = DC.C;

  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function open(grid, x, y) { grid[y * C.GRID + x] = 1; }
  function isOpen(grid, x, y) {
    if (x < 1 || y < 1 || x >= C.GRID - 1 || y >= C.GRID - 1) return false;
    return grid[y * C.GRID + x] === 1;
  }

  /* --- normal maze ------------------------------------------------------ */
  DC.Maze = {};

  DC.Maze.generate = function (rng) {
    const G = C.GRID;
    const grid = new Uint8Array(G * G); // 0 = solid rock
    const cells = Math.floor((G - 1) / 2); // 29 cells per axis (odd tiles 1..57)
    const visited = new Uint8Array(cells * cells);

    const stack = [[0, 0]];
    visited[0] = 1;
    open(grid, 1, 1);

    while (stack.length) {
      const cur = stack[stack.length - 1];
      const cx = cur[0], cy = cur[1];
      const opts = [];
      for (let i = 0; i < 4; i++) {
        const nx = cx + DIRS[i][0], ny = cy + DIRS[i][1];
        if (nx >= 0 && ny >= 0 && nx < cells && ny < cells && !visited[ny * cells + nx]) opts.push([nx, ny]);
      }
      if (!opts.length) { stack.pop(); continue; }
      const n = rng.pick(opts);
      visited[n[1] * cells + n[0]] = 1;
      open(grid, n[0] * 2 + 1, n[1] * 2 + 1);
      open(grid, cx + n[0] + 1, cy + n[1] + 1); // wall between the two cells
      stack.push(n);
    }

    // Braid: punch through dead ends so the maze has loops and no traps.
    for (let cy = 0; cy < cells; cy++) {
      for (let cx = 0; cx < cells; cx++) {
        let openDirs = 0;
        for (let i = 0; i < 4; i++) {
          if (isOpen(grid, cx * 2 + 1 + DIRS[i][0], cy * 2 + 1 + DIRS[i][1])) openDirs++;
        }
        if (openDirs > 1 || !rng.chance(0.72)) continue;
        const cand = [];
        for (let i = 0; i < 4; i++) {
          const nx = cx + DIRS[i][0], ny = cy + DIRS[i][1];
          if (nx < 0 || ny < 0 || nx >= cells || ny >= cells) continue;
          const wx = cx * 2 + 1 + DIRS[i][0], wy = cy * 2 + 1 + DIRS[i][1];
          if (grid[wy * G + wx] === 0) cand.push([wx, wy]);
        }
        if (cand.length) { const w = rng.pick(cand); open(grid, w[0], w[1]); }
      }
    }

    // Extra loops through the remaining cell-separating walls (~10%).
    for (let y = 1; y < G - 1; y++) {
      for (let x = 1; x < G - 1; x++) {
        if (grid[y * G + x] !== 0) continue;
        if ((x + y) % 2 === 0) continue; // pillar corner, keep it
        let a, b;
        if (x % 2 === 0) { a = [x - 1, y]; b = [x + 1, y]; }
        else { a = [x, y - 1]; b = [x, y + 1]; }
        if (!isOpen(grid, a[0], a[1]) || !isOpen(grid, b[0], b[1])) continue;
        if (rng.chance(0.1)) open(grid, x, y);
      }
    }

    // A handful of chambers so it is not corridors the whole way.
    const rooms = 5 + rng.int(0, 4);
    for (let i = 0; i < rooms; i++) {
      const cx = rng.int(1, cells - 2), cy = rng.int(1, cells - 2);
      const w = rng.int(1, 2) * 2 + 1, h = rng.int(1, 2) * 2 + 1; // 3 or 5 tiles
      const tx = cx * 2 + 1, ty = cy * 2 + 1;
      for (let y = ty - (h >> 1); y <= ty + (h >> 1); y++)
        for (let x = tx - (w >> 1); x <= tx + (w >> 1); x++)
          if (x > 0 && y > 0 && x < G - 1 && y < G - 1) open(grid, x, y);
    }

    return grid;
  };

  /* --- boss arena ------------------------------------------------------- */
  DC.Maze.arena = function (rng, keepOut) {
    const G = C.GRID;
    const grid = new Uint8Array(G * G);
    for (let y = 0; y < G; y++)
      for (let x = 0; x < G; x++)
        grid[y * G + x] = (x === 0 || y === 0 || x === G - 1 || y === G - 1) ? 0 : 1;

    // Pillars, kept clear of the spawn / boss / merchant zones.
    const avoid = keepOut || [];
    let placed = 0, guard = 0;
    const want = 10 + rng.int(0, 6);
    while (placed < want && guard++ < 400) {
      const w = rng.int(1, 2) + 1, h = rng.int(1, 2) + 1; // 2..3 tiles
      const x = rng.int(3, G - 4 - w), y = rng.int(3, G - 4 - h);
      const cxm = (x + w / 2) * C.TILE, cym = (y + h / 2) * C.TILE;
      let ok = true;
      for (let i = 0; i < avoid.length; i++) {
        if (Math.hypot(cxm - avoid[i].x, cym - avoid[i].y) < avoid[i].r) { ok = false; break; }
      }
      if (!ok) continue;
      for (let yy = y; yy < y + h; yy++)
        for (let xx = x; xx < x + w; xx++) grid[yy * G + xx] = 0;
      placed++;
    }
    return grid;
  };

  /* --- graph tools ------------------------------------------------------ */
  DC.Maze.openTiles = function (grid) {
    const out = [];
    for (let y = 0; y < C.GRID; y++)
      for (let x = 0; x < C.GRID; x++)
        if (grid[y * C.GRID + x] === 1) out.push(y * C.GRID + x);
    return out;
  };

  /* BFS over open tiles. Returns { dist: Int32Array (-1 = unreachable), order }. */
  DC.Maze.bfs = function (grid, sx, sy, allowDiagonal) {
    const G = C.GRID;
    const dist = new Int32Array(G * G).fill(-1);
    const order = [];
    if (sx < 0 || sy < 0 || sx >= G || sy >= G || grid[sy * G + sx] !== 1) return { dist, order };
    const q = new Int32Array(G * G);
    let head = 0, tail = 0;
    dist[sy * G + sx] = 0;
    q[tail++] = sy * G + sx;
    const step = allowDiagonal
      ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
      : DIRS;
    while (head < tail) {
      const cur = q[head++];
      const cx = cur % G, cy = (cur - cx) / G;
      const d = dist[cur];
      for (let i = 0; i < step.length; i++) {
        const nx = cx + step[i][0], ny = cy + step[i][1];
        if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue;
        if (grid[ny * G + nx] !== 1) continue;
        if (i >= 4) { // no corner cutting
          if (grid[cy * G + nx] !== 1 || grid[ny * G + cx] !== 1) continue;
        }
        const ni = ny * G + nx;
        if (dist[ni] !== -1) continue;
        dist[ni] = d + 1;
        order.push(ni);
        q[tail++] = ni;
      }
    }
    return { dist, order };
  };

  /* True when every open tile is reachable from (sx, sy). */
  DC.Maze.allReachable = function (grid, sx, sy) {
    const r = DC.Maze.bfs(grid, sx, sy);
    let openCount = 0, reached = 0;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] !== 1) continue;
      openCount++;
      if (r.dist[i] >= 0) reached++;
    }
    return openCount === reached;
  };
})(typeof window !== 'undefined' ? window : globalThis);
