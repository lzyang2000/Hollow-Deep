/* Boss. Big, hits far harder, and sleeps until you hit it first. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;

  DC.Boss = {
    create: function (kind, x, y, depth, rng, player, entry) {
      const base = DC.BOSS[kind];
      const tier = Math.max(1, Math.round(depth / 10));
      const roster = DC.LORE.bosses.length;
      const cycle = Math.floor((tier - 1) / roster);
      const e = entry || DC.LORE.bosses[(tier - 1) % roster];
      let name = e.name;
      if (cycle > 0) name = DC.LORE.echoPrefixes[(cycle - 1) % DC.LORE.echoPrefixes.length].toUpperCase() + ' ' + name;

      const mult = DC.Progression.enemyMult(player || { bonusAtk: 0, bonusDef: 0, bonusHp: 0, bonusMp: 0 }, depth);
      const tierMul = 1 + 0.35 * (tier - 1);
      const hp = Math.round(base.hp * tierMul * mult);
      return {
        kind: 'boss', uid: 'boss', bossKind: kind, tier, name, line: e.line,
        x, y, r: base.r, hp, maxHp: hp,
        atk: base.atk * tierMul * mult, defVal: Math.round(base.def * mult * 0.7),
        speed: base.speed, awake: false, dead: false, deadT: 0,
        attackCd: 1.2, windup: 0, windupMax: 0, action: null, actionT: 0,
        slamCd: 3.5, volleyCd: 2.5, chargeCd: 5,
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

      if (!b.enraged && b.hp <= b.maxHp * 0.35) {
        b.enraged = true;
        DC.Audio.play('roar', { pitch: 0.75 });
        game.shake(1.2);
        game.log(b.name + ' is bleeding light. It gets faster.', '#ff8a5c');
        DC.Props.ring(world, b.x, b.y, b.r + 6, { color: '#ff5c5c', life: 0.7, width: 5 });
      }

      if (!p || p.dead) return;
      const dist = Math.hypot(p.x - b.x, p.y - b.y);
      const los = DC.hasLOS(world, b.x, b.y, p.x, p.y);
      const speedMul = b.enraged ? 1.18 : 1;
      b.attackCd -= dt; b.slamCd -= dt; b.volleyCd -= dt; b.chargeCd -= dt;

      /* --- action state machine ------------------------------------------ */
      if (b.action === 'charge') {
        b.actionT -= dt;
        const moved = DC.moveBody(world, b, b.cvx * dt, b.cvy * dt);
        if (!b.hitPlayer && Math.hypot(p.x - b.x, p.y - b.y) < b.r + p.r + 0.4) {
          DC.Combat.damagePlayer(world, p, b.atk * 1.15, game, { fromX: b.x, fromY: b.y, knock: 4.5, killer: b.name });
          b.hitPlayer = true;
        }
        if (!moved || b.actionT <= 0) { b.action = null; b.chargeCd = b.enraged ? 3.2 : 5; }
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
          start(BossAct.slam, b, 0.75);
        } else if (b.bossKind === 'mage' && b.volleyCd <= 0 && dist > 8) {
          start(BossAct.volley, b, 0.55);
        } else if (b.bossKind === 'knight' && b.chargeCd <= 0 && dist > 10 && dist < 60) {
          start(BossAct.charge, b, 0.7);
        } else if (dist < reach + 2) {
          start(BossAct.sweep, b, 0.45);
        } else if (b.bossKind === 'mage' && b.volleyCd <= 0) {
          start(BossAct.volley, b, 0.55);
        }
      }

      /* --- close the distance -------------------------------------------- */
      let vx = 0, vy = 0;
      const want = b.bossKind === 'mage' ? 12 : b.r + 2.2;
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
        DC.Combat.damagePlayer(world, p, b.atk * 1.05, game, { fromX: b.x, fromY: b.y, knock: 4, killer: b.name });
      }
      b.slamCd = (b.enraged ? 2.4 : 3.8) * game.rng.range(0.85, 1.2);
      b.attackCd = 0.5;
    },
    sweep: function (world, b, game) {
      DC.Props.ring(world, b.x, b.y, b.r + 3.6, { color: '#ffd166', life: 0.3, width: 3 });
      DC.Audio.play('swing', { pitch: 0.65 });
      DC.Combat.sweep(world, { side: 'demon', x: b.x, y: b.y, aim: b.aim, name: b.name },
        { arc: 150, reach: b.r + 3.4, dmg: b.atk, knock: 3.4 }, game);
      b.attackCd = (b.enraged ? 0.85 : 1.3) * game.rng.range(0.85, 1.2);
    },
    volley: function (world, b, game) {
      const n = b.enraged ? 9 : 6;
      const spread = 0.62;
      const base = b.aim;
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * (spread / (n - 1)) * 2 + game.rng.range(-0.03, 0.03);
        world.projectiles.push(DC.Props.projectile({
          x: b.x + Math.cos(a) * (b.r + 0.6), y: b.y + Math.sin(a) * (b.r + 0.6),
          vx: Math.cos(a) * 17, vy: Math.sin(a) * 17,
          dmg: b.atk * 0.55, side: 'demon', life: 3.2, kind: 'fire',
          color: '#ff7a59', r: 0.42, sourceName: b.name,
        }));
      }
      DC.Audio.play('cast', { pitch: 0.8 });
      b.volleyCd = (b.enraged ? 2.0 : 3.2) * game.rng.range(0.85, 1.2);
      b.attackCd = 0.6;
    },
    charge: function (world, b, game) {
      const a = b.aim;
      b.action = 'charge';
      b.actionT = 1.1;
      b.cvx = Math.cos(a) * 17; b.cvy = Math.sin(a) * 17;
      b.hitPlayer = false;
      DC.Audio.play('roar', { pitch: 0.9 });
      DC.Props.ring(world, b.x, b.y, b.r + 3, { color: '#c9d4e8', life: 0.4, width: 4 });
    },
  };

  function execute(world, b, game) {
    if (b.pending) { const fn = b.pending; b.pending = null; fn(world, b, game); }
  }
  BossAct.execute = execute;
  DC.Boss.ACTIONS = BossAct;
})(typeof window !== 'undefined' ? window : globalThis);
