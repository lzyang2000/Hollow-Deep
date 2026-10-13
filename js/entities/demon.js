/* Demons. They mirror the player careers, they are one tier weaker, and they do
   not attack until they have actually seen you. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;
  const C = DC.C;

  let UID = 1;

  DC.Demons = {
    create: function (kind, x, y, depth, rng, player) {
      const def = DC.DEMONS[kind];
      const mult = DC.Progression.enemyMult(player || { bonusAtk: 0, bonusDef: 0, bonusHp: 0, bonusMp: 0 }, depth);
      const hp = Math.round(def.hp * mult);
      return {
        uid: UID++, kind, def, name: def.name,
        x, y, r: def.r,
        hp, maxHp: hp,
        atk: def.atk * mult,
        defVal: Math.round(def.def * mult * 0.7),
        // A ranged demon's stride is capped per-kind: depth may buy it hp, atk
        // and defence, but never the legs to escape a career it already lost.
        speed: def.speed * M.clamp(1 + (mult - 1) * 0.25, 1, def.speedCap || 1.5),
        state: 'idle', hasSeen: false, alertedT: 0,
        attackCd: rng.range(0, 1), windup: 0, windupMax: 0,
        hitFlash: 0, kx: 0, ky: 0,
        anim: rng.range(0, 6.28), facing: rng.range(0, 6.28),
        wanderT: 0, wx: 0, wy: 0, strafe: rng.chance(0.5) ? 1 : -1,
        dead: false, deadT: 0, mult,
      };
    },

    /* Aggro budget. Waking costs a slot; dying or leashing gives it back. */
    aggroOpen: function (world) {
      const cap = Math.min(C.AGGRO_MAX,
        Math.round(C.AGGRO_BASE + C.AGGRO_PER_DEPTH * (world.depth || 1)));
      return (world.awakeCount || 0) < cap;
    },

    wake: function (world, d, game, opts) {
      if (d.hasSeen) return false;
      d.hasSeen = true;
      d.state = 'hunt';
      d.lostT = 0;
      world.awakeCount = (world.awakeCount || 0) + 1;
      if (!(opts && opts.silent)) {
        const id = d.def.id;
        DC.Audio.play('spot', { pitch: id === 'gorewarden' ? 0.65 : id === 'imp' ? 1.4 : 1.0 });
        DC.Props.floater(world, d.x, d.y - d.r - 0.5, '!', '#ff8a5c', { life: 0.7, size: 15 });
      }
      return true;
    },

    calm: function (world, d) {
      if (!d.hasSeen) return false;
      d.hasSeen = false;
      d.state = 'idle';
      d.windup = 0;
      d.lostT = 0;
      world.awakeCount = Math.max(0, (world.awakeCount || 0) - 1);
      return true;
    },

    update: function (world, d, dt, game) {
      if (d.dead) { d.deadT += dt; return; }
      const p = world.actor;
      const def = d.def;
      d.anim += dt;
      d.attackCd -= dt;
      d.hitFlash = Math.max(0, d.hitFlash - dt);

      /* --- sight gate: nothing happens until it has seen the player ------
         A floor is crowded, but only AGGRO of them hunt at once, so you can
         always pull a pack instead of being eaten by the whole level. */
      if (!d.hasSeen && p && !p.dead) {
        const dist = Math.hypot(p.x - d.x, p.y - d.y);
        if (dist <= def.sight && DC.hasLOS(world, d.x, d.y, p.x, p.y) && DC.Demons.aggroOpen(world)) {
          DC.Demons.wake(world, d, game);
        }
      }

      let vx = 0, vy = 0;
      const dist = p ? Math.hypot(p.x - d.x, p.y - d.y) : 999;
      /* A voxel walk per demon per frame is the expensive part of a crowded
         floor. Nothing below reads sight beyond the leash radius, so a demon
         that is nowhere near you does not get one. */
      const los = (p && dist <= C.SIGHT_CULL) ? DC.hasLOS(world, d.x, d.y, p.x, p.y) : false;

      if (!d.hasSeen || !p || p.dead) {
        // Idle drift. Keeps the level feeling alive without giving anything away.
        d.wanderT -= dt;
        if (d.wanderT <= 0) {
          d.wanderT = game.rng.range(1.6, 4.2);
          const a = game.rng.range(0, Math.PI * 2);
          d.wx = Math.cos(a); d.wy = Math.sin(a);
        }
        vx = d.wx * def.speed * 0.3;
        vy = d.wy * def.speed * 0.3;
      } else {
        d.state = 'hunt';
        const dir = DC.Flow.step(world, d);
        const sp = d.speed;
        if (def.attackKind === 'ranged') {
          const keep = def.keepRange;
          if (dist > keep + 2.5) {
            if (dir) { vx = dir.x * sp; vy = dir.y * sp; }
            else { const a = Math.atan2(p.y - d.y, p.x - d.x); vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; }
          } else if (dist < keep - 3) {
            const a = Math.atan2(d.y - p.y, d.x - p.x);
            vx = Math.cos(a) * sp; vy = Math.sin(a) * sp;
          } else if (los) {
            const a = Math.atan2(p.y - d.y, p.x - d.x) + d.strafe * Math.PI / 2;
            vx = Math.cos(a) * sp * 0.7; vy = Math.sin(a) * sp * 0.7;
            if (game.rng.chance(0.01)) d.strafe *= -1;
          }
        } else {
          if (dist > def.reach * 0.8) {
            if (dir) { vx = dir.x * sp; vy = dir.y * sp; }
            else { const a = Math.atan2(p.y - d.y, p.x - d.x); vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; }
          }
        }
        if (vx || vy) d.facing = Math.atan2(vy, vx);

        /* Leash: break sight, get away, and it eventually forgets you. That
           hands its aggro slot to whoever you meet next. */
        if (!los || dist > C.LEASH_DIST) {
          d.lostT = (d.lostT || 0) + dt;
          if (d.lostT >= C.LEASH_TIME && dist > C.LEASH_DIST * 0.6) DC.Demons.calm(world, d);
        } else {
          d.lostT = 0;
        }
      }

      /* --- attacks ------------------------------------------------------- */
      if (d.hasSeen && p && !p.dead && d.windup <= 0 && d.attackCd <= 0) {
        if (def.attackKind === 'ranged') {
          if (los && dist < def.keepRange + 6) {
            d.windup = 0.35; d.windupMax = 0.35;
            d.facing = Math.atan2(p.y - d.y, p.x - d.x);
          }
        } else if (dist <= def.reach + p.r + 0.25 && los) {
          d.windup = def.id === 'gorewarden' ? 0.6 : 0.32;
          d.windupMax = d.windup;
          d.facing = Math.atan2(p.y - d.y, p.x - d.x);
          d.aim = d.facing;
        }
      } else if (d.windup > 0) {
        d.windup -= dt;
        d.aim = d.aim == null ? d.facing : d.aim;
        if (d.windup <= 0) {
          d.attackCd = def.attackCd * game.rng.range(0.9, 1.15);
          if (def.attackKind === 'ranged') {
            const lead = 0.28;
            const tx = p.x + (p.lastVx || 0) * lead, ty = p.y + (p.lastVy || 0) * lead;
            const a = Math.atan2(ty - d.y, tx - d.x);
            world.projectiles.push(DC.Props.projectile({
              x: d.x + Math.cos(a) * (d.r + 0.3), y: d.y + Math.sin(a) * (d.r + 0.3),
              vx: Math.cos(a) * def.projSpeed, vy: Math.sin(a) * def.projSpeed,
              dmg: d.atk, side: 'demon', life: def.projLife, kind: 'fire',
              color: '#ff8a5c', r: 0.32, sourceName: def.name,
            }));
            DC.Audio.play('cast', { pitch: 1.25 });
          } else if (def.id === 'gorewarden') {
            /* A Gorewarden is a wall of plate with a hammer, and the honest
               read of it is that its slam is huge -- but huge in a direction.
               It used to damage anything within reach + 1.2 m, all the way
               round, while the telegraph on the floor was a wedge in front of
               it: so the one thing the game told you to do, step aside, was
               the one thing that did not work. The ring stays as dust and
               noise; the damage is the wedge. */
            DC.Props.ring(world, d.x, d.y, def.reach + 1.2, { color: '#ff5c5c', life: 0.35, width: 4 });
            DC.Audio.play('slam');
            game.shake(0.5);
            DC.Combat.sweep(world, { side: 'demon', x: d.x, y: d.y, aim: d.aim, name: def.name },
              { arc: def.arc, reach: def.reach + 1.2, dmg: d.atk, knock: def.knockback || 2.6 }, game);
          } else {
            DC.Combat.sweep(world, { side: 'demon', x: d.x, y: d.y, aim: d.aim, name: def.name },
              { arc: def.arc, reach: def.reach, dmg: d.atk, knock: def.knockback || 1.6 }, game);
            DC.Audio.play('swing', { pitch: 0.9 });
          }
        }
      }

      /* --- separation so a pack does not become one blob ------------------
         Squared distances and an axis reject: with a couple of hundred
         demons on a floor this loop is the other half of the frame budget. */
      for (let i = 0; i < world.demons.length; i++) {
        const o = world.demons[i];
        if (o === d || o.dead) continue;
        const dx = d.x - o.x;
        const min = d.r + o.r;
        if (dx > min || dx < -min) continue;
        const dy = d.y - o.y;
        if (dy > min || dy < -min) continue;
        const dd2 = dx * dx + dy * dy;
        if (dd2 <= 0.0001 || dd2 >= min * min) continue;
        const dd = Math.sqrt(dd2);
        vx += (dx / dd) * (min - dd) * 4;
        vy += (dy / dd) * (min - dd) * 4;
      }

      vx += d.kx; vy += d.ky;
      d.kx *= Math.pow(0.0008, dt); d.ky *= Math.pow(0.0008, dt);
      DC.moveBody(world, d, vx * dt, vy * dt);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
