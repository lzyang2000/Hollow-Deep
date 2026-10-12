/* The delver. Three careers, one shared body: WASD move, mouse aim, click attack,
   Space ability. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;

  DC.Player = {
    create: function (classId) {
      const cls = DC.CLASSES[classId];
      const p = {
        kind: 'player', cls, classId,
        x: 0, y: 0, r: 0.7,
        bonusAtk: 0, bonusDef: 0, bonusHp: 0, bonusMp: 0, bonusMove: 0, bonusAtkSpeed: 0,
        weapon: null, armor: null,
        potions: { heal: 1, mana: 1 },
        gold: 0,
        aim: 0, facing: 0,
        attackTimer: 0, swing: null, abilityCd: 0, shieldT: 0,
        invuln: 0, hurtT: 0, kx: 0, ky: 0,
        anim: 0, walk: 0, dead: false, deadT: 0,
        lastVx: 0, lastVy: 0,
        noManaT: 0,
      };
      DC.Player.recalc(p);
      p.hp = p.maxHp; p.mp = p.maxMp;
      return p;
    },

    recalc: function (p) {
      const c = p.cls;
      p.maxHp = Math.round(c.hp + p.bonusHp);
      p.maxMp = Math.round(c.mp + p.bonusMp);
      p.speed = c.speed + p.bonusMove;
      p.def = c.def + p.bonusDef;
      p.atk = c.atk + p.bonusAtk;
      p.attackInterval = c.attackCd / (1 + p.bonusAtkSpeed);
      p.hp = Math.min(p.hp, p.maxHp);
      p.mp = Math.min(p.mp, p.maxMp);
    },

    update: function (world, p, input, dt, game) {
      if (p.dead) { p.deadT += dt; return; }
      p.anim += dt;
      p.attackTimer -= dt;
      p.abilityCd -= dt;
      p.shieldT = Math.max(0, p.shieldT - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      p.hurtT = Math.max(0, p.hurtT - dt);
      p.noManaT = Math.max(0, p.noManaT - dt);

      /* --- move ----------------------------------------------------------- */
      let mx = input.moveX, my = input.moveY;
      const mag = Math.hypot(mx, my);
      if (mag > 0) { mx /= mag; my /= mag; }
      const sp = p.speed * (p.shieldT > 0 ? 0.75 : 1);
      let vx = mx * sp, vy = my * sp;
      vx += p.kx; vy += p.ky;
      p.kx *= Math.pow(0.0006, dt); p.ky *= Math.pow(0.0006, dt);
      DC.moveBody(world, p, vx * dt, vy * dt);
      p.lastVx = vx; p.lastVy = vy;
      if (mag > 0) { p.walk += dt * sp * 1.6; p.facing = Math.atan2(my, mx); }

      /* --- aim ------------------------------------------------------------ */
      p.aim = input.aim;

      /* --- attack --------------------------------------------------------- */
      if (input.firing && p.attackTimer <= 0) DC.Player.attack(world, p, game);
      if (p.swing) { p.swing.t -= dt; if (p.swing.t <= 0) p.swing = null; }

      /* --- resources ------------------------------------------------------ */
      p.mp = Math.min(p.maxMp, p.mp + p.cls.mpRegen * dt);
    },

    attack: function (world, p, game) {
      const c = p.cls;
      p.attackTimer = p.attackInterval;
      if (c.attackKind === 'melee') {
        p.swing = { t: 0.2, arc: c.arc, reach: c.reach, dir: p.aim, kind: 'swing' };
        const hits = DC.Combat.sweep(world, { side: 'player', x: p.x, y: p.y, aim: p.aim },
          { arc: c.arc, reach: c.reach, dmg: p.atk, knock: c.knockback || 1.8 }, game);
        DC.Audio.play('swing', { pitch: 1.05 });
        if (hits) game.stats.meleeHits += hits;
      } else {
        if (p.mp < c.mpCost) {
          if (p.noManaT <= 0) {
            p.noManaT = 1.0;
            DC.Audio.play('empty');
            DC.Props.floater(world, p.x, p.y - p.r - 0.6, 'out of mana', '#6bb6ff', { life: 0.9, size: 12 });
          }
          p.attackTimer = 0.2;
          return;
        }
        p.mp -= c.mpCost;
        const a = p.aim + game.rng.range(-0.02, 0.02);
        world.projectiles.push(DC.Props.projectile({
          x: p.x + Math.cos(a) * (p.r + 0.35), y: p.y + Math.sin(a) * (p.r + 0.35),
          vx: Math.cos(a) * c.projSpeed, vy: Math.sin(a) * c.projSpeed,
          dmg: p.atk, side: 'player', life: c.projLife, kind: 'bolt',
          pierce: c.pierce, splash: c.splash, color: c.color, r: 0.34,
        }));
        DC.Audio.play('cast', { pitch: 1.1 });
      }
    },

    ability: function (world, p, game) {
      const ab = p.cls.ability;
      if (p.abilityCd > 0 || p.dead) return false;
      if (p.mp < ab.mp) {
        if (p.noManaT <= 0) { p.noManaT = 1.0; DC.Audio.play('empty'); game.log('Not enough MP for ' + ab.name, '#6bb6ff'); }
        return false;
      }
      p.mp -= ab.mp;
      p.abilityCd = ab.cd;
      if (ab.id === 'blink') {
        const a = p.aim;
        let tx = p.x, ty = p.y;
        for (let s = 0.5; s <= 9; s += 0.5) {
          const nx = p.x + Math.cos(a) * s, ny = p.y + Math.sin(a) * s;
          if (DC.isSolidAt(world, nx, ny)) break;
          tx = nx; ty = ny;
        }
        DC.Props.burst(world, p.x, p.y, 14, { color: [p.cls.color, '#ffffff'], spMin: 2, spMax: 6, lifeMin: 0.2, lifeMax: 0.5 });
        p.x = tx; p.y = ty;
        DC.Props.ring(world, p.x, p.y, 2.2, { color: p.cls.color, life: 0.35, width: 3 });
        DC.Audio.play('blink');
      } else if (ab.id === 'whirlwind') {
        p.swing = { t: 0.3, arc: 360, reach: p.cls.reach + 0.7, dir: p.aim, kind: 'whirl' };
        DC.Combat.sweep(world, { side: 'player', x: p.x, y: p.y, aim: p.aim },
          { arc: 360, reach: p.cls.reach + 0.7, dmg: p.atk * 1.5, knock: 2.6 }, game);
        DC.Props.ring(world, p.x, p.y, p.cls.reach + 0.9, { color: p.cls.color, life: 0.4, width: 4 });
        DC.Audio.play('whirl');
      } else if (ab.id === 'shieldwall') {
        p.shieldT = 3.2;
        DC.Props.ring(world, p.x, p.y, 2.4, { color: p.cls.color, life: 0.5, width: 4 });
        DC.Audio.play('shield');
      }
      return true;
    },

    drink: function (world, p, key, game) {
      const pot = DC.POTIONS[key];
      if (!pot || !(p.potions[key] > 0)) { DC.Audio.play('empty'); return false; }
      p.potions[key]--;
      if (pot.kind === 'hp') {
        const amt = Math.round(p.maxHp * pot.frac);
        p.hp = Math.min(p.maxHp, p.hp + amt);
        DC.Props.floater(world, p.x, p.y - p.r - 0.5, '+' + amt, '#ff6b6b', { life: 1.1, size: 14 });
      } else {
        const amt = Math.round(p.maxMp * pot.frac);
        p.mp = Math.min(p.maxMp, p.mp + amt);
        DC.Props.floater(world, p.x, p.y - p.r - 0.5, '+' + amt + ' MP', '#6bb6ff', { life: 1.1, size: 14 });
      }
      DC.Audio.play('drink');
      return true;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
