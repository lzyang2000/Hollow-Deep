/* Damage, melee arcs, projectiles, knockback and death handling. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;

  DC.Combat = {};

  DC.Combat.knockback = function (body, fromX, fromY, force) {
    if (body.noKnockback) return;
    const dx = body.x - fromX, dy = body.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    body.kx = (body.kx || 0) + (dx / len) * force;
    body.ky = (body.ky || 0) + (dy / len) * force;
  };

  DC.Combat.damageDemon = function (world, d, amount, game, opts) {
    opts = opts || {};
    if (d.dead) return 0;
    const dmg = Math.max(1, Math.round(amount));
    d.hp -= dmg;
    d.hitFlash = 0.14;
    DC.Demons.wake(world, d, game, { silent: true });  // being hit counts as seeing
    DC.Props.floater(world, d.x + 0.3, d.y - d.r, String(dmg), opts.color || '#ffe9b0', { life: 0.8, size: 12 });
    DC.Props.burst(world, d.x, d.y, 6, { color: ['#ff6b5a', '#c9342b', '#ffd166'], spMin: 2, spMax: 6, lifeMin: 0.15, lifeMax: 0.4 });
    if (opts.knock) DC.Combat.knockback(d, opts.fromX == null ? d.x : opts.fromX, opts.fromY == null ? d.y : opts.fromY, opts.knock);
    DC.Audio.play('hit', { pitch: 0.9 + DC.fallbackRng.range(0, 0.25) });
    if (d.hp <= 0) DC.Combat.killDemon(world, d, game);
    return dmg;
  };

  DC.Combat.killDemon = function (world, d, game) {
    if (d.dead) return;
    DC.Demons.calm(world, d);     // give the aggro slot back
    d.dead = true;
    d.deadT = 0;
    DC.Audio.play('demonDeath', { pitch: d.def.id === 'gorewarden' ? 0.6 : d.def.id === 'imp' ? 1.35 : 1.0 });
    DC.Props.burst(world, d.x, d.y, 22, { color: ['#ff6b5a', '#c9342b', '#7a1a14', '#ffd166'], spMin: 2, spMax: 8, lifeMin: 0.3, lifeMax: 0.8, sizeMax: 0.26 });
    DC.Props.ring(world, d.x, d.y, 1.6, { color: '#c9342b', life: 0.3, width: 2 });
    game.stats.kills++;
    const res = DC.Loot.grant(game, world, 'kill', d.x, d.y);
    game.log(res.text, res.color);
    DC.Props.floater(world, d.x, d.y - d.r - 0.6, res.text, res.color, { life: 1.4, size: 12 });
  };

  DC.Combat.damageBoss = function (world, b, amount, game, opts) {
    opts = opts || {};
    if (b.dead) return 0;
    if (!b.awake) {
      b.awake = true;
      game.onBossWake(b);
    }
    /* A Sovereign's hide is real. b.defVal used to be computed and then never
       read -- every blow landed whole, which is one reason a throne room was a
       punching bag. Flat subtraction like the player's own armour, but floored
       at a quarter of the blow so a Sovereign can never be made immune by a
       stack of small bolts. */
    const def = b.defVal || 0;
    const dmg = Math.max(1, Math.min(Math.round(amount), Math.max(Math.round(amount * 0.25), Math.round(amount - def))));
    b.hp -= dmg;
    b.hitFlash = 0.12;
    DC.Props.floater(world, b.x + 0.6, b.y - b.r, String(dmg), '#ffe9b0', { life: 0.9, size: 15 });
    DC.Props.burst(world, b.x, b.y, 8, { color: ['#ffd166', '#ff8a5c', '#fff2c0'], spMin: 3, spMax: 8, lifeMin: 0.2, lifeMax: 0.5 });
    DC.Audio.play('bossHit', { pitch: 0.85 });
    if (opts.knock) DC.Combat.knockback(b, opts.fromX, opts.fromY, opts.knock * 0.25);
    if (b.hp <= 0) {
      b.dead = true;
      b.deadT = 0;
      DC.Audio.play('bossDeath');
      DC.Props.burst(world, b.x, b.y, 70, { color: ['#ffd166', '#ff8a5c', '#fff2c0', '#ff5c5c'], spMin: 3, spMax: 14, lifeMin: 0.5, lifeMax: 1.4, sizeMax: 0.4 });
      DC.Props.ring(world, b.x, b.y, 14, { color: '#ffd166', life: 1.0, width: 5 });
      game.onBossDeath(b);
    }
    return dmg;
  };

  DC.Combat.damagePlayer = function (world, p, amount, game, opts) {
    opts = opts || {};
    if (p.dead) return 0;
    if (p.invuln > 0) return 0;
    let dmg = Math.max(1, Math.round(amount - p.def));
    if (p.shieldT > 0) dmg = Math.max(1, Math.round(dmg * 0.3));
    p.hp -= dmg;
    p.invuln = 0.45;
    p.hurtT = 0.35;
    game.shake(0.5 + Math.min(1.2, dmg / 30));
    DC.Audio.play('playerHurt', { pitch: p.shieldT > 0 ? 1.4 : 1.0 });
    DC.Props.floater(world, p.x, p.y - p.r - 0.4, '-' + dmg, '#ff6b6b', { life: 0.9, size: 14 });
    DC.Props.burst(world, p.x, p.y, 8, { color: ['#ff6b6b', '#ffd166'], spMin: 2, spMax: 6, lifeMin: 0.2, lifeMax: 0.5 });
    if (p.shieldT <= 0) DC.Combat.knockback(p, opts.fromX == null ? p.x : opts.fromX, opts.fromY == null ? p.y : opts.fromY, opts.knock || 1.2);
    if (p.hp <= 0) { p.hp = 0; game.onPlayerDeath(opts.killer || 'the dark'); }
    return dmg;
  };

  /* Melee arc. attacker.side decides who gets hit. */
  DC.Combat.sweep = function (world, attacker, o, game) {
    const arc = o.arc, reach = o.reach, dmg = o.dmg;
    const half = arc / 2;
    let hits = 0;
    const targets = attacker.side === 'player' ? world.demons : [world.actor];
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t || (attacker.side === 'player' && t.dead)) continue;
      if (attacker.side !== 'player' && t.dead) continue;
      const dx = t.x - attacker.x, dy = t.y - attacker.y;
      const dist = Math.hypot(dx, dy);
      if (dist > reach + t.r) continue;
      if (arc < 359) {
        const a = Math.atan2(dy, dx);
        if (Math.abs(M.angleDiff(attacker.aim, a)) > half) continue;
      }
      if (attacker.side === 'player') {
        DC.Combat.damageDemon(world, t, dmg * (0.9 + game.rng.range(0, 0.2)), game, {
          knock: o.knock || 1.6, fromX: attacker.x, fromY: attacker.y,
        });
      } else {
        DC.Combat.damagePlayer(world, t, dmg, game, { fromX: attacker.x, fromY: attacker.y, knock: o.knock || 1.4, killer: attacker.name });
      }
      hits++;
    }
    if (attacker.side === 'player') DC.Combat.smashUrnsArc(world, attacker, o, game);
    // Boss is a target for the player too.
    if (attacker.side === 'player' && world.boss && !world.boss.dead) {
      const b = world.boss;
      const dx = b.x - attacker.x, dy = b.y - attacker.y;
      if (Math.hypot(dx, dy) <= reach + b.r && (arc >= 359 || Math.abs(M.angleDiff(attacker.aim, Math.atan2(dy, dx))) <= half)) {
        DC.Combat.damageBoss(world, b, dmg * (0.9 + game.rng.range(0, 0.2)), game, { knock: o.knock || 1.2, fromX: attacker.x, fromY: attacker.y });
        hits++;
      }
    }
    return hits;
  };

  /* Pottery breaks: melee arcs sweep the alcoves, impacts shatter what is
     nearby. Urns never block anything, they just sit there being breakable. */
  DC.Combat.smashUrnsArc = function (world, attacker, o, game) {
    const half = o.arc / 2;
    for (let i = 0; i < world.urns.length; i++) {
      const u = world.urns[i];
      if (u.broken) continue;
      const dx = u.x - attacker.x, dy = u.y - attacker.y;
      if (Math.hypot(dx, dy) > o.reach + u.r + 0.4) continue;
      if (o.arc < 359 && Math.abs(M.angleDiff(attacker.aim, Math.atan2(dy, dx))) > half) continue;
      u.broken = true;
      DC.Loot.onUrn(game, world, u);
    }
  };

  DC.Combat.smashUrnsAt = function (world, x, y, r, game) {
    for (let i = 0; i < world.urns.length; i++) {
      const u = world.urns[i];
      if (u.broken) continue;
      if (Math.hypot(u.x - x, u.y - y) > r + u.r) continue;
      u.broken = true;
      DC.Loot.onUrn(game, world, u);
    }
  };

  DC.Combat.projectileHit = function (world, pr, target, game) {
    if (pr.side === 'player') {
      if (target.kind === 'boss') DC.Combat.damageBoss(world, target, pr.dmg, game, { fromX: pr.x, fromY: pr.y, knock: 0.6 });
      else DC.Combat.damageDemon(world, target, pr.dmg, game, { fromX: pr.x, fromY: pr.y, knock: 0.9 });
    } else {
      DC.Combat.damagePlayer(world, target, pr.dmg, game, { fromX: pr.x, fromY: pr.y, knock: 1.0, killer: pr.sourceName || 'a demon' });
    }
  };

  DC.Combat.updateProjectiles = function (world, dt, game) {
    const list = world.projectiles;
    for (let i = list.length - 1; i >= 0; i--) {
      const pr = list[i];
      pr.life -= dt;
      if (pr.life <= 0) { list.splice(i, 1); continue; }
      const steps = Math.max(1, Math.ceil(Math.hypot(pr.vx, pr.vy) * dt / 1.2));
      let removed = false;
      for (let s = 0; s < steps && !removed; s++) {
        pr.x += pr.vx * dt / steps;
        pr.y += pr.vy * dt / steps;
        if (DC.isSolidAt(world, pr.x, pr.y)) {
          DC.Props.burst(world, pr.x, pr.y, 5, { color: [pr.color, '#ffffff'], spMin: 1, spMax: 4, lifeMin: 0.1, lifeMax: 0.3 });
          DC.Combat.smashUrnsAt(world, pr.x, pr.y, pr.splash || 1.2, game);
          if (pr.splash) DC.Combat.splash(world, pr, game);
          list.splice(i, 1); removed = true; break;
        }
        if (pr.side === 'player') {
          for (let k = 0; k < world.demons.length; k++) {
            const d = world.demons[k];
            if (d.dead) continue;
            if (Math.hypot(d.x - pr.x, d.y - pr.y) > d.r + pr.r) continue;
            if (pr.hitIds && pr.hitIds.indexOf(d.uid) >= 0) continue;
            DC.Combat.projectileHit(world, pr, d, game);
            DC.Combat.smashUrnsAt(world, pr.x, pr.y, pr.splash || 1.0, game);
            if (!pr.hitIds) pr.hitIds = [];
            pr.hitIds.push(d.uid);
            if (pr.pierce <= 0) { if (pr.splash) DC.Combat.splash(world, pr, game); list.splice(i, 1); removed = true; }
            else pr.pierce--;
            break;
          }
          if (removed) break;
          const b = world.boss;
          if (b && !b.dead && Math.hypot(b.x - pr.x, b.y - pr.y) <= b.r + pr.r) {
            DC.Combat.projectileHit(world, pr, b, game);
            if (pr.splash) DC.Combat.splash(world, pr, game);
            list.splice(i, 1); removed = true; break;
          }
        } else {
          const p = world.actor;
          if (p && !p.dead && Math.hypot(p.x - pr.x, p.y - pr.y) <= p.r + pr.r) {
            DC.Combat.projectileHit(world, pr, p, game);
            if (pr.splash) DC.Combat.splash(world, pr, game);
            list.splice(i, 1); removed = true; break;
          }
        }
      }
      if (!removed) {
        pr.trail += dt;
        if (pr.kind === 'bolt' && pr.trail > 0.02) {
          pr.trail = 0;
          world.particles.push(DC.Props.particle({
            x: pr.x, y: pr.y, vx: -pr.vx * 0.05, vy: -pr.vy * 0.05,
            life: 0.22, size: pr.r * 0.8, color: pr.color, kind: 'glow', drag: 4,
          }));
        }
      }
    }
  };

  DC.Combat.splash = function (world, pr, game) {
    const R = pr.splash;
    DC.Props.ring(world, pr.x, pr.y, R, { color: pr.color, life: 0.28, width: 2 });
    DC.Props.burst(world, pr.x, pr.y, 10, { color: [pr.color, '#ffffff'], spMin: 2, spMax: 7, lifeMin: 0.15, lifeMax: 0.4 });
    if (pr.side === 'player') {
      for (let k = 0; k < world.demons.length; k++) {
        const d = world.demons[k];
        if (d.dead) continue;
        if (Math.hypot(d.x - pr.x, d.y - pr.y) > R + d.r) continue;
        if (pr.hitIds && pr.hitIds.indexOf(d.uid) >= 0) continue;
        DC.Combat.damageDemon(world, d, pr.dmg * 0.6, game, { fromX: pr.x, fromY: pr.y, knock: 0.5 });
      }
    } else {
      const p = world.actor;
      if (p && !p.dead && Math.hypot(p.x - pr.x, p.y - pr.y) <= R + p.r) {
        DC.Combat.damagePlayer(world, p, pr.dmg * 0.6, game, { fromX: pr.x, fromY: pr.y, killer: pr.sourceName || 'a demon' });
      }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
