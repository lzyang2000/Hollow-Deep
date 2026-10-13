/* Boss. Big, hits far harder, and sleeps until you hit it first. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;

  DC.Boss = {
    create: function (kind, x, y, depth, rng, player, entry) {
      const base = DC.BOSS[kind];
      const tier = DC.bossTier(depth);
      const roster = DC.LORE.bosses.length;
      const cycle = Math.floor((tier - 1) / roster);
      const e = entry || DC.LORE.bosses[(tier - 1) % roster];
      let name = e.name;
      if (cycle > 0) name = DC.LORE.echoPrefixes[(cycle - 1) % DC.LORE.echoPrefixes.length].toUpperCase() + ' ' + name;

      const mult = DC.Progression.enemyMult(player || { bonusAtk: 0, bonusDef: 0, bonusHp: 0, bonusMp: 0 }, depth);
      /* The slope is per sovereign, not per depth. They stand in the way twice
         as often now, so the per-sovereign slope halved with the cadence -- and
         0.65 + 0.175 * tier is then the very number the old 1 + 0.35 * (tier-1)
         produced at the same depth (depth 40 is x2.05 either way). So a
         Sovereign waiting on depth 40 is exactly as dangerous as it always was;
         there are simply twice as many of them between the surface and you.
         Halving the slope the other way (1 + 0.18 * (tier - 1)) made the deep
         ones ~10% beefier and the depth-5 throne killed 9 bot runs out of 48
         instead of 4, so the parity version is the one that stays. */
      /* The slope came up. A kitted delver was walking out of throne rooms in
         twenty seconds with most of their health, so every Sovereign is about
         twelve percent more of a problem per tier than it was -- and the
         chamber it waits in is a quarter the size, which is the half of this
         change that actually bites. */
      const tierMul = 0.72 + 0.2 * tier;
      const hp = Math.round(base.hp * tierMul * mult);
      return {
        kind: 'boss', uid: 'boss', bossKind: kind, tier, name, line: e.line,
        seal: DC.sealLabel(tier),
        x, y, r: base.r, hp, maxHp: hp,
        atk: base.atk * tierMul * mult, defVal: Math.round(base.def * mult * 0.7),
        speed: base.speed, awake: false, dead: false, deadT: 0,
        attackCd: 1.2, windup: 0, windupMax: 0, action: null, actionT: 0,
        slamCd: 3.5, volleyCd: 2.5, chargeCd: 5, lungeCd: 2.5, hurlCd: 2.2,
        // How badly it has been walked down. Ramps while the delver camps out
        // of reach and decays the moment they are inside it.
        relent: 0, cvx: 0, cvy: 0,
        hitFlash: 0, kx: 0, ky: 0, anim: 0, aim: 0, facing: 0,
        enraged: false, mult, tierMul, sleepBreath: 0,
      };
    },

    update: function (world, b, dt, game) {
      if (b.dead) { b.deadT += dt; return; }
      b.anim += dt;
      b.hitFlash = Math.max(0, b.hitFlash - dt);
      const p = world.actor;

      if (!b.awake) { b.sleepBreath += dt; return; }   // dormant: no move, no attack

      if (!b.enraged && b.hp <= b.maxHp * 0.45) {
        b.enraged = true;
        DC.Audio.play('roar', { pitch: 0.75 });
        game.shake(1.2);
        game.log(b.name + ' is bleeding light. It gets faster.', '#ff8a5c');
        DC.Props.ring(world, b.x, b.y, b.r + 6, { color: '#ff5c5c', life: 0.7, width: 5 });
      }

      if (!p || p.dead) return;
      const dist = Math.hypot(p.x - b.x, p.y - b.y);
      const los = DC.hasLOS(world, b.x, b.y, p.x, p.y);
      b.attackCd -= dt; b.slamCd -= dt; b.volleyCd -= dt; b.chargeCd -= dt; b.lungeCd -= dt; b.hurlCd -= dt;

      /* --- the deep closes ------------------------------------------------
         Standing fourteen metres back and clicking was not a tactic, it was a
         free win: a Sovereign walks 2.9-4.6 m/s and a delver walks 4.6, so the
         distance never closed and nothing it threw ever landed. Camping out of
         reach now winds the Sovereign up over about three and a half seconds
         -- forty percent more legs and a quarter off every windup -- and it
         says so, with a ring and a roar, the moment it is fully wound. Keep
         moving and it decays again. */
      const standOff = b.bossKind === 'mage' ? 10 : b.r + 2.2;
      const camping = dist > Math.max(11, standOff * 1.7);
      const wasRelent = b.relent;
      b.relent = M.clamp(b.relent + (camping ? dt / 3.5 : -dt / 1.6), 0, 1);
      if (wasRelent < 0.999 && b.relent >= 0.999) {
        DC.Audio.play('roar', { pitch: 1.05 });
        game.log(b.name + ' stops letting you walk away.', '#ff8a5c');
        DC.Props.ring(world, b.x, b.y, b.r + 5, { color: '#ff5c5c', life: 0.6, width: 4 });
      }
      const speedMul = (b.enraged ? 1.18 : 1) * (1 + 0.42 * b.relent);
      const wind = function (w) { return w * (1 - 0.24 * b.relent); };
      // Wound up, it also throws things sooner. Legs without range just moves
      // the problem from "nothing lands" to "nothing lands but slower".

      /* --- action state machine ------------------------------------------ */
      if (b.action === 'charge' || b.action === 'lunge') {
        const isCharge = b.action === 'charge';
        b.actionT -= dt;
        const moved = DC.moveBody(world, b, b.cvx * dt, b.cvy * dt);
        if (!b.hitPlayer && Math.hypot(p.x - b.x, p.y - b.y) < b.r + p.r + 0.4) {
          DC.Combat.damagePlayer(world, p, b.atk * (isCharge ? 1.0 : 0.95), game,
            { fromX: b.x, fromY: b.y, knock: isCharge ? 4.5 : 3.2, killer: b.name });
          b.hitPlayer = true;
        }
        if (!moved || b.actionT <= 0) {
          b.action = null;
          if (isCharge) b.chargeCd = cdMul(b, game, b.enraged ? 2.6 : 4);
          else {
            // A blade shape that cannot reach a bolt camp just chases forever.
            // If the lunge fell short it hops again, on half the wait.
            b.lungeCd = cdMul(b, game, b.enraged ? 3.0 : 4.5) * (dist > 9 ? 0.45 : 1);
          }
          // It arrives somewhere. So does the floor. Sidestepping a charge was
          // previously a free dodge; now the ground where it lands is not. But
          // the wave is for the delver who *did* step aside -- someone it
          // already body-checked does not also get the ground.
          if (!b.hitPlayer) BossAct.shockwave(world, b, game, isCharge ? 0.8 : 0.6);
        }
        return;
      }

      if (b.windup > 0) {
        b.windup -= dt;
        if (b.windup <= 0) BossAct.execute(world, b, game);
        return;
      }

      /* --- pick the next attack ------------------------------------------ */
      if (b.attackCd <= 0 && los) {
        const reach = b.r + 3.4;
        if (b.slamCd <= 0 && dist < b.r + 7) {
          start(BossAct.slam, b, wind(0.75));
        } else if (b.bossKind === 'mage' && b.volleyCd <= 0 && dist > 8) {
          start(BossAct.volley, b, wind(0.5));
        } else if (b.bossKind === 'knight' && b.chargeCd <= 0 && dist > 7 && dist < 60) {
          start(BossAct.charge, b, wind(0.62));
        } else if (b.bossKind === 'knight' && b.hurlCd <= 0 && dist > 9 && dist < 45) {
          // Plate used to have no answer at all past seven metres, so a bolt
          // camp at twenty-two was a free win: charge, miss, walk, never be
          // touched. The shield is the answer -- slow enough to read, but it
          // leads, and it makes holding still cost something.
          start(BossAct.hurl, b, wind(0.55));
        } else if (b.bossKind === 'swordsman' && b.lungeCd <= 0 && dist > 4.5 && dist < 34) {
          // The blade shape used to have nothing but a sweep and a slam, and
          // at 4.6 m/s it is exactly as fast as a mage -- so it could never,
          // ever reach one. A lunge is how it gets there.
          start(BossAct.lunge, b, wind(0.38));
        } else if (dist < reach + 2) {
          start(BossAct.sweep, b, wind(0.45));
        } else if (b.bossKind === 'mage' && b.volleyCd <= 0) {
          start(BossAct.volley, b, wind(0.5));
        }
      }

      /* --- close the distance -------------------------------------------- */
      let vx = 0, vy = 0;
      const want = b.bossKind === 'mage' ? 10 : b.r + 2.2;
      if (dist > want + 1) {
        const dir = DC.Flow.step(world, b) || { x: (p.x - b.x) / dist, y: (p.y - b.y) / dist };
        vx = dir.x * b.speed * speedMul; vy = dir.y * b.speed * speedMul;
      } else if (b.bossKind === 'mage' && dist < want - 3) {
        const a = Math.atan2(b.y - p.y, b.x - p.x);
        vx = Math.cos(a) * b.speed * 0.8; vy = Math.sin(a) * b.speed * 0.8;
      }
      vx += b.kx; vy += b.ky;
      b.kx *= Math.pow(0.002, dt); b.ky *= Math.pow(0.002, dt);
      DC.moveBody(world, b, vx * dt, vy * dt);
      if (vx || vy) b.facing = Math.atan2(vy, vx);
      b.aim = Math.atan2(p.y - b.y, p.x - b.x);
    },
  };

  /* Same ramp the update loop uses, reachable from the action table. */
  function cdMul(b, game, cd) {
    return cd * (1 - 0.3 * b.relent) * game.rng.range(0.85, 1.2);
  }

  function start(fn, b, windup) {
    b.pending = fn;
    b.windup = windup;
    b.windupMax = windup;
  }

  const BossAct = {
    slam: function (world, b, game) {
      const R = b.r + 4.6;
      DC.Props.ring(world, b.x, b.y, R, { color: '#ff5c5c', life: 0.5, width: 6 });
      DC.Props.burst(world, b.x, b.y, 26, { color: ['#ff8a5c', '#ffd166', '#c9342b'], spMin: 4, spMax: 12, lifeMin: 0.3, lifeMax: 0.8 });
      DC.Audio.play('slam', { pitch: 0.7 });
      game.shake(1.0);
      const p = world.actor;
      if (p && !p.dead && Math.hypot(p.x - b.x, p.y - b.y) <= R + p.r) {
        DC.Combat.damagePlayer(world, p, b.atk * 0.95, game, { fromX: b.x, fromY: b.y, knock: 4, killer: b.name });
      }
      b.slamCd = (b.enraged ? 1.7 : 2.7) * game.rng.range(0.85, 1.2);
      b.attackCd = 0.5;
    },
    sweep: function (world, b, game) {
      DC.Props.ring(world, b.x, b.y, b.r + 3.6, { color: '#ffd166', life: 0.3, width: 3 });
      DC.Audio.play('swing', { pitch: 0.65 });
      DC.Combat.sweep(world, { side: 'demon', x: b.x, y: b.y, aim: b.aim, name: b.name },
        { arc: 150, reach: b.r + 3.4, dmg: b.atk, knock: 3.4 }, game);
      b.attackCd = (b.enraged ? 0.62 : 0.95) * game.rng.range(0.85, 1.2);
    },
    volley: function (world, b, game) {
      const p = world.actor;
      const n = b.enraged ? 8 : 6;
      const spread = 0.85;
      /* Lead the delver, the way an Imp already does. A 17 m/s bolt fired at
         where a strafing body *was* is a free miss at any range, which is most
         of why a ranged player never felt a Sovereign at all. */
      const flight = Math.min(1.1, Math.hypot(p.x - b.x, p.y - b.y) / 23);
      const tx = p.x + (p.lastVx || 0) * flight * 0.9;
      const ty = p.y + (p.lastVy || 0) * flight * 0.9;
      const base = Math.atan2(ty - b.y, tx - b.x);
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * (spread / (n - 1)) * 2 + game.rng.range(-0.03, 0.03);
        // Staggered speeds: a volley that all arrives in the same instant can
        // only ever cost one hit, because the player gets 0.45 s of immunity
        // after the first. Spread it over half a second and it costs two.
        const sp = 21 + i * 1.7;
        world.projectiles.push(DC.Props.projectile({
          x: b.x + Math.cos(a) * (b.r + 0.6), y: b.y + Math.sin(a) * (b.r + 0.6),
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          dmg: b.atk * 0.5, side: 'demon', life: 3.2, kind: 'fire',
          color: '#ff7a59', r: 0.42, sourceName: b.name,
        }));
      }
      DC.Audio.play('cast', { pitch: 0.8 });
      b.volleyCd = (b.enraged ? 2.2 : 2.8) * game.rng.range(0.85, 1.2);
      b.attackCd = 0.55;
    },
    charge: function (world, b, game) {
      const p = world.actor;
      // Aim where the delver is going, not where they are: a straight-line
      // charge at a standing still target is the only charge that used to hit.
      const lead = Math.min(0.5, Math.hypot(p.x - b.x, p.y - b.y) / 21);
      const tx = p.x + (p.lastVx || 0) * lead, ty = p.y + (p.lastVy || 0) * lead;
      const a = Math.atan2(ty - b.y, tx - b.x);
      b.action = 'charge';
      b.actionT = 1.25;
      b.cvx = Math.cos(a) * 21; b.cvy = Math.sin(a) * 21;
      b.hitPlayer = false;
      DC.Audio.play('roar', { pitch: 0.9 });
      DC.Props.ring(world, b.x, b.y, b.r + 3, { color: '#c9d4e8', life: 0.4, width: 4 });
      DC.Props.ring(world, tx, ty, 3.2, { color: '#c9d4e8', life: 0.62, width: 3 });
    },
    lunge: function (world, b, game) {
      const p = world.actor;
      const lead = Math.min(0.4, Math.hypot(p.x - b.x, p.y - b.y) / 24);
      const tx = p.x + (p.lastVx || 0) * lead, ty = p.y + (p.lastVy || 0) * lead;
      const a = Math.atan2(ty - b.y, tx - b.x);
      b.action = 'lunge';
      b.actionT = 0.55;
      b.cvx = Math.cos(a) * 26; b.cvy = Math.sin(a) * 26;
      b.hitPlayer = false;
      b.aim = a;
      DC.Audio.play('swing', { pitch: 0.8 });
      DC.Props.ring(world, b.x, b.y, b.r + 2.4, { color: '#ff5c5c', life: 0.35, width: 3 });
    },
    hurl: function (world, b, game) {
      const p = world.actor;
      // Slow enough to step aside from -- but it leads, and it is thrown by
      // something that will then charge you, so reading one is the price of
      // surviving the other.
      const lead = Math.min(0.7, Math.hypot(p.x - b.x, p.y - b.y) / 19);
      const tx = p.x + (p.lastVx || 0) * lead, ty = p.y + (p.lastVy || 0) * lead;
      const a = Math.atan2(ty - b.y, tx - b.x);
      const n = b.enraged ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const aa = a + (i - (n - 1) / 2) * 0.34 + game.rng.range(-0.05, 0.05);
        world.projectiles.push(DC.Props.projectile({
          x: b.x + Math.cos(aa) * (b.r + 0.5), y: b.y + Math.sin(aa) * (b.r + 0.5),
          vx: Math.cos(aa) * 12.5, vy: Math.sin(aa) * 12.5,
          dmg: b.atk * 0.5, side: 'demon', life: 4, kind: 'shield',
          color: '#c9d4e8', r: 0.62, sourceName: b.name,
        }));
      }
      DC.Audio.play('swing', { pitch: 1.15 });
      DC.Props.ring(world, b.x, b.y, b.r + 1.6, { color: '#c9d4e8', life: 0.3, width: 3 });
      b.hurlCd = cdMul(b, game, b.enraged ? 3.0 : 4.2);
      b.attackCd = 0.5;
    },
    shockwave: function (world, b, game, scale) {
      const R = b.r + 4.2;
      DC.Props.ring(world, b.x, b.y, R, { color: '#c9d4e8', life: 0.45, width: 5 });
      DC.Props.burst(world, b.x, b.y, 16, { color: ['#ffd166', '#c9d4e8', '#ff8a5c'], spMin: 3, spMax: 9, lifeMin: 0.2, lifeMax: 0.6 });
      DC.Audio.play('slam', { pitch: 0.85 });
      game.shake(0.7);
      const p = world.actor;
      if (p && !p.dead && Math.hypot(p.x - b.x, p.y - b.y) <= R + p.r) {
        DC.Combat.damagePlayer(world, p, b.atk * 0.7 * (scale || 1), game,
          { fromX: b.x, fromY: b.y, knock: 3.2, killer: b.name });
      }
    },
  };

  function execute(world, b, game) {
    if (b.pending) { const fn = b.pending; b.pending = null; fn(world, b, game); }
  }
  BossAct.execute = execute;
  DC.Boss.ACTIONS = BossAct;
})(typeof window !== 'undefined' ? window : globalThis);
