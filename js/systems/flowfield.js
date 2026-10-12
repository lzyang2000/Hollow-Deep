/* One BFS distance field from the player's tile, shared by every alerted demon.
   3600 tiles is trivial to rebuild a few times a second and beats per-agent
   steering for corridors, where greedy "walk at the player" gets stuck. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const C = DC.C;

  DC.Flow = {
    refresh: function (world, dt) {
      world.flowAt -= dt;
      if (world.flowAt > 0) return;
      world.flowAt = C.FLOW_INTERVAL;
      const p = world.actor;
      if (!p) return;
      const tx = Math.floor(p.x / C.TILE), ty = Math.floor(p.y / C.TILE);
      if (DC.isSolid(world, tx, ty)) return;
      world.flow = DC.Maze.bfs(world.grid, tx, ty).dist;
    },

    /* Unit direction the demon should step, or null when no route exists. */
    step: function (world, d) {
      const flow = world.flow;
      if (!flow) return null;
      const G = C.GRID;
      const tx = Math.floor(d.x / C.TILE), ty = Math.floor(d.y / C.TILE);
      const here = flow[ty * G + tx];
      if (here < 0) return null;
      let best = here, bx = 0, by = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = tx + dx, ny = ty + dy;
          if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue;
          if (world.grid[ny * G + nx] !== 1) continue;
          if (dx && dy && (world.grid[ty * G + nx] !== 1 || world.grid[ny * G + tx] !== 1)) continue;
          const v = flow[ny * G + nx];
          if (v >= 0 && v < best) { best = v; bx = dx; by = dy; }
        }
      }
      if (!bx && !by) return null;
      const len = Math.hypot(bx, by);
      return { x: bx / len, y: by / len };
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
