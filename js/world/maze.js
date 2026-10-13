/* Procedural level geometry.

   Normal levels: a dungeon of rooms of assorted sizes joined by corridors,
   with extra loops and alcoves off the corridors. This is deliberately not a
   lattice maze: rooms sit at arbitrary positions, corridors run between their
   centres, and some corridors are two tiles wide, so the map reads as built
   space rather than a grid of identical cells.

   Boss levels: a 50 m square chamber in the middle of solid rock, with a
   few pillars. The chamber is DC.Maze.arenaRect(); everything outside it is
   rock, so the portal is the only way in or out.

   Invariants enforced here and asserted by tmp/test_maze.js:
     - border ring is always solid
     - every open tile is reachable from the returned start
     - generate() returns { grid, rooms, start }
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

  DC.Maze = {};
  DC.Maze.DIRS = DIRS;

  /* Carve an axis-first-then-other L between two points, w tiles wide. */
  function carveLine(grid, x0, y0, x1, y1, w) {
    const G = C.GRID;
    const carve = function (cx, cy) {
      for (let oy = 0; oy < w; oy++) {
        for (let ox = 0; ox < w; ox++) {
          const px = cx + ox, py = cy + oy;
          if (px > 0 && py > 0 && px < G - 1 && py < G - 1) open(grid, px, py);
        }
      }
    };
    let x = x0, y = y0;
    const sx = x1 > x ? 1 : (x1 < x ? -1 : 0);
    const sy = y1 > y ? 1 : (y1 < y ? -1 : 0);
    while (x !== x1) { carve(x, y); x += sx; }
    while (y !== y1) { carve(x, y); y += sy; }
    carve(x, y);
  }

  /* One corridor between two rooms: an L with a jittered bend, sometimes a
     second bend, so corridors never all share the same axes. */
  function carveCorridor(grid, a, b, rng) {
    const w = rng.chance(C.CORRIDOR_WIDE_CHANCE) ? 2 : 1;
    let mx, my;
    if (rng.chance(0.5)) { mx = b.cx; my = a.cy; } else { mx = a.cx; my = b.cy; }
    if (rng.chance(0.6)) {
      if (mx !== a.cx) mx = a.cx + rng.int(-3, 3); else my = a.cy + rng.int(-3, 3);
    }
    mx = Mclamp(mx, 1, C.GRID - 2); my = Mclamp(my, 1, C.GRID - 2);
    carveLine(grid, a.cx, a.cy, mx, my, w);
    carveLine(grid, mx, my, b.cx, b.cy, w);
  }

  function Mclamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* Small nooks hanging off corridor tiles -- the "by the side of the road"
     spots that chests, urns and sleeping demons sit in. */
  function addAlcoves(grid, rooms, rng) {
    const G = C.GRID;
    const inRoom = function (x, y) {
      for (let i = 0; i < rooms.length; i++) {
        const r = rooms[i];
        if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return true;
      }
      return false;
    };
    const cand = [];
    for (let y = 1; y < G - 1; y++) {
      for (let x = 1; x < G - 1; x++) {
        if (grid[y * G + x] !== 1 || inRoom(x, y)) continue;
        for (let i = 0; i < 4; i++) {
          const dx = DIRS[i][0], dy = DIRS[i][1];
          if (isOpen(grid, x + dx, y + dy)) continue;
          if (isOpen(grid, x + dx * 2, y + dy * 2)) continue;
          cand.push([x, y, dx, dy]);
        }
      }
    }
    rng.shuffle(cand);
    const want = C.ALCOVE_MIN + rng.int(0, C.ALCOVE_MAX - C.ALCOVE_MIN);
    let placed = 0;
    for (let i = 0; i < cand.length && placed < want; i++) {
      const x = cand[i][0], y = cand[i][1], dx = cand[i][2], dy = cand[i][3];
      const len = rng.int(2, 4);
      let cx = x + dx, cy = y + dy, ok = true;
      for (let k = 0; k < len; k++) {
        if (cx <= 0 || cy <= 0 || cx >= G - 1 || cy >= G - 1) { ok = false; break; }
        open(grid, cx, cy);
        cx += dx; cy += dy;
      }
      if (!ok) continue;
      // Sometimes the stub opens into a little nook.
      if (rng.chance(0.55)) {
        const px = cx - dx, py = cy - dy;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const ax = px + ox, ay = py + oy;
            if (ax > 0 && ay > 0 && ax < G - 1 && ay < G - 1) open(grid, ax, ay);
          }
        }
      }
      placed++;
    }
  }

  DC.Maze.generate = function (rng) {
    const G = C.GRID;
    const grid = new Uint8Array(G * G); // 0 = solid rock
    const rooms = [];

    // 1. Rooms, assorted sizes, never touching (a tile of rock between them).
    const want = C.ROOM_COUNT_MIN + rng.int(0, C.ROOM_COUNT_MAX - C.ROOM_COUNT_MIN);
    let guard = 0;
    while (rooms.length < want && guard++ < 4000) {
      const w = rng.int(C.ROOM_MIN, C.ROOM_MAX), h = rng.int(C.ROOM_MIN, C.ROOM_MAX);
      const x = rng.int(2, G - 3 - w), y = rng.int(2, G - 3 - h);
      let ok = true;
      for (let i = 0; i < rooms.length; i++) {
        const r = rooms[i];
        if (x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y) { ok = false; break; }
      }
      if (!ok) continue;
      rooms.push({ x: x, y: y, w: w, h: h, cx: x + (w >> 1), cy: y + (h >> 1) });
    }
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++) open(grid, x, y);
    }

    // 2. Cheapest-link spanning tree over room centres: no islands, and the
    //    links stay short so the level reads as a walkable plan.
    const n = rooms.length;
    const linked = new Uint8Array(n);
    linked[0] = 1;
    const d2 = function (a, b) { return Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy); };
    const edges = [];
    const pushEdges = function (i) {
      for (let j = 0; j < n; j++) if (!linked[j]) edges.push([i, j, d2(rooms[i], rooms[j])]);
    };
    pushEdges(0);
    for (let count = 1; count < n; count++) {
      let bi = -1;
      for (let e = 0; e < edges.length; e++) {
        if (linked[edges[e][1]]) continue;
        if (bi < 0 || edges[e][2] < edges[bi][2]) bi = e;
      }
      if (bi < 0) break;
      const e = edges.splice(bi, 1)[0];
      linked[e[1]] = 1;
      carveCorridor(grid, rooms[e[0]], rooms[e[1]], rng);
      pushEdges(e[1]);
    }

    // 3. Extra links between nearby rooms: loops, so the level is not a tree
    //    of dead ends and a demon can come at you from two ways.
    let extras = Math.round(n * C.ROOM_LOOP_CHANCE);
    guard = 0;
    while (extras > 0 && guard++ < 200) {
      const a = rng.int(0, n - 1), b = rng.int(0, n - 1);
      if (a === b) continue;
      if (d2(rooms[a], rooms[b]) > C.ROOM_LOOP_MAX_DIST) continue;
      carveCorridor(grid, rooms[a], rooms[b], rng);
      extras--;
    }

    // 4. Alcoves off the corridors.
    addAlcoves(grid, rooms, rng);

    // 5. Start inside a random room, away from the border.
    const home = rooms[rng.int(0, rooms.length - 1)];
    const start = [home.cx, home.cy];

    return { grid: grid, rooms: rooms, start: start };
  };

  /* --- the throne chamber ------------------------------------------------
     A Sovereign used to stand in the middle of the whole 200 m floor, which
     made the fight a lap of an empty stadium: enough open ground to kite
     forever, and no corner in the room that anything had to be decided in.
     It is a 50 m square of open floor hewn out of solid rock at the centre of
     the level, with a handful of pillars to break line of sight. Everything
     outside the chamber is rock, so the only way in and out is the portal. */
  DC.Maze.arenaRect = function () {
    const G = C.GRID;
    const half = Math.max(3, Math.floor(C.ARENA_TILES / 2));
    let x0 = (G >> 1) - half, x1 = (G >> 1) + half - 1;
    let y0 = (G >> 1) - half, y1 = (G >> 1) + half - 1;
    if (x0 < 1) { x1 += 1 - x0; x0 = 1; }
    if (y0 < 1) { y1 += 1 - y0; y0 = 1; }
    if (x1 > G - 2) { x0 -= x1 - (G - 2); x1 = G - 2; }
    if (y1 > G - 2) { y0 -= y1 - (G - 2); y1 = G - 2; }
    return { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };

  DC.Maze.arena = function (rng, keepOut) {
    const G = C.GRID;
    const grid = new Uint8Array(G * G);            // 0 = rock, everywhere
    const R = DC.Maze.arenaRect();
    for (let y = R.y0; y <= R.y1; y++)
      for (let x = R.x0; x <= R.x1; x++) grid[y * G + x] = 1;

    // Pillars, kept clear of the spawn / Sovereign / merchant zones. In a
    // 10x10 room a 3-tile pillar is a wall, so these are 1-2 tiles each and
    // there are only a few of them: enough to hide behind, not enough to
    // corner yourself.
    const avoid = keepOut || [];
    let placed = 0, guard = 0;
    const want = 2 + rng.int(0, 3);
    while (placed < want && guard++ < 300) {
      const w = rng.int(1, 2), h = rng.int(1, 2);
      if (R.x1 - R.x0 < 5 || R.y1 - R.y0 < 5) break;
      const x = rng.int(R.x0 + 2, R.x1 - 2 - w), y = rng.int(R.y0 + 2, R.y1 - 2 - h);
      const cxm = (x + w / 2) * C.TILE, cym = (y + h / 2) * C.TILE;
      let ok = true;
      for (let k = 0; k < avoid.length; k++) {
        if (Math.hypot(cxm - avoid[k].x, cym - avoid[k].y) < avoid[k].r) { ok = false; break; }
      }
      if (!ok) continue;
      for (let yy = y; yy < y + h; yy++)
        for (let xx = x; xx < x + w; xx++) grid[yy * G + xx] = 0;
      placed++;
    }
    return grid;
  };

  /* The largest r such that the (2r+1)^2 block around a tile is all open floor
     and clear of the rock border. Corridors (1-2 tiles wide), doorways and
     alcoves all stop at r = 0 or 1, which is exactly the difference a gate
     cares about. */
  DC.Maze.openRadius = function (grid, tx, ty, maxR) {
    const G = C.GRID;
    for (let r = 1; r <= maxR; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;   // only the new ring
          const X = tx + dx, Y = ty + dy;
          if (X < 1 || Y < 1 || X > G - 2 || Y > G - 2) return r - 1;
          if (grid[Y * G + X] !== 1) return r - 1;                  // 1 = open floor
        }
      }
    }
    return maxR;
  };

  /* The nearest tile to a world point with at least needR of open floor all
     the way round, spiralling out and relaxing the requirement rather than
     failing. Used when a gate has to open at a spot nobody chose -- where a
     Sovereign actually fell, which may be against a pillar. */
  DC.Maze.portalNear = function (grid, wx, wy, needR) {
    const G = C.GRID;
    const tx = Math.min(G - 2, Math.max(1, Math.floor(wx / C.TILE)));
    const ty = Math.min(G - 2, Math.max(1, Math.floor(wy / C.TILE)));
    for (let need = needR; need >= 0; need--) {
      let best = null, bestD = Infinity;
      for (let y = 1; y < G - 1; y++) {
        for (let x = 1; x < G - 1; x++) {
          if (grid[y * G + x] !== 1) continue;
          if (DC.Maze.openRadius(grid, x, y, need) < need) continue;
          const d = Math.abs(x - tx) + Math.abs(y - ty);
          if (d < bestD) { bestD = d; best = [x, y]; }
        }
      }
      if (best) return best;
    }
    return [tx, ty];
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
    if (sx < 0 || sy < 0 || sx >= G || sy >= G || grid[sy * G + sx] !== 1) return { dist: dist, order: order };
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
    return { dist: dist, order: order };
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
