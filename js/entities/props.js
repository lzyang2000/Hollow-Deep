/* Chests, the merchant, portals, projectiles, particles and floating text. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;

  DC.Props = {};

  DC.Props.chest = function (x, y, rng, depth) {
    return {
      kind: 'chest', x, y, r: 0.85, opened: false, anim: rng.range(0, 6.28),
      locked: false, depth, lid: 0, sparkle: 0,
    };
  };

  DC.Props.merchant = function (x, y, rng, depth) {
    return {
      kind: 'merchant', x, y, r: 0.95, anim: 0, bob: rng.range(0, 6.28),
      line: rng.pick(DC.LORE.merchantLines),
      stock: DC.shopStock(rng, depth),
    };
  };

  DC.Props.projectile = function (o) {
    return {
      x: o.x, y: o.y, vx: o.vx, vy: o.vy,
      r: o.r || 0.35, dmg: o.dmg, side: o.side, // 'player' | 'demon' | 'boss'
      life: o.life || 1.2, maxLife: o.life || 1.2,
      kind: o.kind || 'bolt', pierce: o.pierce || 0, splash: o.splash || 0,
      hitIds: null, trail: 0, color: o.color || '#9fe8ff',
    };
  };

  DC.Props.particle = function (o) {
    return {
      x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0,
      life: o.life || 0.5, maxLife: o.life || 0.5,
      size: o.size || 0.12, color: o.color || '#fff',
      kind: o.kind || 'spark', drag: o.drag == null ? 3.2 : o.drag,
      grav: o.grav || 0, rot: o.rot || 0, spin: o.spin || 0,
    };
  };

  DC.Props.burst = function (world, x, y, n, o) {
    o = o || {};
    const rng = o.rng || DC.fallbackRng;
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, Math.PI * 2);
      const sp = rng.range(o.spMin || 2, o.spMax || 7);
      world.particles.push(DC.Props.particle({
        x: x + Math.cos(a) * (o.off || 0), y: y + Math.sin(a) * (o.off || 0),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rng.range(o.lifeMin || 0.25, o.lifeMax || 0.6),
        size: rng.range(o.sizeMin || 0.08, o.sizeMax || 0.2),
        color: Array.isArray(o.color) ? rng.pick(o.color) : (o.color || '#ffd9a0'),
        kind: o.kind || 'spark', grav: o.grav || 0, drag: o.drag,
      }));
    }
    if (world.particles.length > 900) world.particles.splice(0, world.particles.length - 900);
  };

  DC.Props.floater = function (world, x, y, text, color, opts) {
    opts = opts || {};
    world.floaters.push({
      x, y, text, color: color || '#fff',
      life: opts.life || 1.0, maxLife: opts.life || 1.0,
      vy: opts.vy == null ? 1.6 : opts.vy, size: opts.size || 13,
      jitter: (world.floaters.length % 7) - 3,
    });
    if (world.floaters.length > 120) world.floaters.shift();
  };

  DC.Props.ring = function (world, x, y, radius, o) {
    o = o || {};
    world.particles.push({
      kind: 'ring', x, y, r: o.r0 || 0.4, maxR: radius, life: o.life || 0.45,
      maxLife: o.life || 0.45, color: o.color || '#ff8a5c', width: o.width || 3,
      vx: 0, vy: 0, fill: !!o.fill,
    });
  };

  DC.updateParticles = function (world, dt) {
    const ps = world.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      if (p.kind === 'ring') {
        p.r = M.lerp(p.maxR, p.r, Math.pow(p.life / p.maxLife, 0.6));
        continue;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += (p.grav || 0) * dt;
      const d = 1 - Math.min(1, (p.drag || 0) * dt);
      p.vx *= d; p.vy *= d;
      p.rot += p.spin * dt;
    }
    const fs = world.floaters;
    for (let i = fs.length - 1; i >= 0; i--) {
      const f = fs[i];
      f.life -= dt;
      f.y -= f.vy * dt;
      if (f.life <= 0) fs.splice(i, 1);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
