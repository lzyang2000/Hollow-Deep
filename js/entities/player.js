/* The delver. Two careers, one shared body: WASD move, mouse aim, click attack,
   Space ability. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;

  DC.Player = {
    create: function (classId) {
      /* A career this build does not offer -- an old save file, an old
         bookmark, an ?auto=swordsman link from before the Swordsman was
         retired -- still has to produce a body. Walk the alias table, then
         fall back to the first career, rather than handing back an object with
         no stats on it and crashing the first recalc. */
      let id = classId;
      if (!DC.CLASSES[id]) id = (DC.CLASS_ALIAS && DC.CLASS_ALIAS[id]) || DC.CLASS_ORDER[0];
      const cls = DC.CLASSES[id];
      const p = {
        kind: 'player', cls, classId: id,
        x: 0, y: 0, r: 0.7,
        bonusAtk: 0, bonusDef: 0, bonusHp: 0, bonusMp: 0, bonusMove: 0, bonusAtkSpeed: 0,
        weapon: null, armor: null,
        inv: [], invSize: DC.C.INV_SIZE,
        potions: { heal: 1, mana: 1 },
        gold: 0,
        aim: 0, facing: 0,
        attackTimer: 0, swing: null, abilityCd: 0, shieldT: 0, castT: 99,
        dodgeCd: 0, dodgeT: 0, dodgeDir: 0,
        invuln: 0, hurtT: 0, kx: 0, ky: 0,
        anim: 0, walk: 0, dead: false, deadT: 0,
        lastVx: 0, lastVy: 0,
        noManaT: 0, calmT: 0, regenT: 0,
      };
      DC.Player.recalc(p);
      p.hp = p.maxHp; p.mp = p.maxMp;
      return p;
    },

    recalc: function (p) {
      const c = p.cls;
      p.maxHp = Math.round(c.hp + p.bonusHp);
      p.maxMp = Math.round(c.mp + p.bonusMp);
      /* Worn steel has weight. Both slots drag, and the floor is there so no
         combination of plate and two-hander can ever weld you to the floor. */
      p.penalty = (p.weapon ? p.weapon.penalty || 0 : 0) + (p.armor ? p.armor.penalty || 0 : 0);
      p.speed = Math.max(1.2, c.speed + p.bonusMove - p.penalty);
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
      p.dodgeCd = Math.max(0, p.dodgeCd - dt);
      p.shieldT = Math.max(0, p.shieldT - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      p.hurtT = Math.max(0, p.hurtT - dt);
      p.noManaT = Math.max(0, p.noManaT - dt);
      p.castT += dt;

      /* --- move ----------------------------------------------------------- */
      let mx = input.moveX, my = input.moveY;
      const mag = Math.hypot(mx, my);
      if (mag > 0) { mx /= mag; my /= mag; }
      let vx, vy;
      if (p.dodgeT > 0) {
        /* A dash is committed. The stick does not steer it, the wall stops it,
           and nothing about it makes you immune to what is already on its way.
           It is a step, not a save. */
        p.dodgeT = Math.max(0, p.dodgeT - dt);
        vx = Math.cos(p.dodgeDir) * DC.C.DODGE_SPEED;
        vy = Math.sin(p.dodgeDir) * DC.C.DODGE_SPEED;
        p.facing = p.dodgeDir;
        p.walk += dt * 9;
      } else {
        const sp = p.speed * (p.shieldT > 0 ? 0.75 : 1);
        vx = mx * sp; vy = my * sp;
        if (mag > 0) { p.walk += dt * sp * 1.6; p.facing = Math.atan2(my, mx); }
      }
      vx += p.kx; vy += p.ky;
      p.kx *= Math.pow(0.0006, dt); p.ky *= Math.pow(0.0006, dt);
      DC.moveBody(world, p, vx * dt, vy * dt);
      p.lastVx = vx; p.lastVy = vy;

      /* --- aim ------------------------------------------------------------ */
      p.aim = input.aim;

      /* --- attack --------------------------------------------------------- */
      // Mid-dash the hands are elsewhere: no swing starts until the feet are
      // back under the body.
      if (input.firing && p.attackTimer <= 0 && p.dodgeT <= 0) DC.Player.attack(world, p, game);
      if (p.swing) { p.swing.t -= dt; if (p.swing.t <= 0) p.swing = null; }

      /* --- resources ------------------------------------------------------ */
      /* A wick that has been burning hard does not refill at the rate of a cold
         one. Regen ramps back over MP_CALM seconds of not casting, so holding
         the trigger bleeds mana and a deliberate shot pays for itself. */
      const heat = M.clamp(p.castT / DC.C.MP_CALM, DC.C.MP_HEAT_FLOOR, 1);
      p.mpRegenMul = heat;
      p.mp = Math.min(p.maxMp, p.mp + p.cls.mpRegen * heat * dt);
      /* Recovery is not a timer on the player, it is a property of the floor:
         calmT only runs while nothing on this level can see you and you have
         not been touched lately. Game.step owns that flag. */
      if (p.calmT > DC.C.REGEN_DELAY && p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * DC.C.REGEN_FRAC * dt);
        p.regenT -= dt;
        if (p.regenT <= 0) {
          p.regenT = 2;
          DC.Props.floater(world, p.x, p.y - p.r - 0.5, 'catching breath', '#8ef0c0', { life: 1.1, size: 11 });
        }
      }
    },

    attack: function (world, p, game) {
      const c = p.cls;
      p.attackTimer = p.attackInterval;
      p.castT = 0;
      if (c.attackKind === 'melee') {
        p.swing = { t: 0.2, dur: 0.2, arc: c.arc, reach: c.reach, dir: p.aim, kind: 'swing' };
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

    /* The dash itself. Direction is the way you are walking, or the way you are
       pointing if you are standing still, so a dodge never turns your back on a
       fight by accident. */
    dodge: function (world, p, game, input) {
      input = input || DC.Input;
      if (p.dead) return false;
      if (p.dodgeCd > 0) {
        // noManaT is the general "you asked and the body said not yet" throttle.
        if (p.noManaT <= 0) {
          p.noManaT = 0.6;
          DC.Audio.play('empty');
          DC.Props.floater(world, p.x, p.y - p.r - 0.6, 'off balance', 'rgba(210,220,235,0.55)', { life: 0.8, size: 11 });
        }
        return false;
      }
      const mx = input.moveX || 0, my = input.moveY || 0;
      const dir = (mx || my) ? Math.atan2(my, mx) : p.aim;
      p.dodgeDir = dir;
      p.dodgeT = DC.C.DODGE_TIME;
      p.dodgeCd = DC.C.DODGE_CD;
      /* The price, and it is a real one: the weight leaves the swing mid-swing.
         A blow already in the air is given up, and the next one cannot start
         until the feet are planted -- so dodge-spamming trades damage for
         distance, which is a decision rather than a reflex. */
      p.swing = null;
      p.attackTimer = Math.max(p.attackTimer, DC.C.DODGE_TIME + DC.C.DODGE_RECOVERY);
      DC.Props.burst(world, p.x - Math.cos(dir) * p.r, p.y - Math.sin(dir) * p.r, 9,
        { color: [p.cls.color, '#ffffff'], spMin: 1, spMax: 4, lifeMin: 0.15, lifeMax: 0.4 });
      DC.Audio.play('dodge');
      return true;
    },

    ability: function (world, p, game) {
      const ab = p.cls.ability;
      if (p.abilityCd > 0 || p.dead) return false;
      if (p.mp < ab.mp) {
        if (p.noManaT <= 0) { p.noManaT = 1.0; DC.Audio.play('empty'); game.log('Not enough MP for ' + ab.name, '#6bb6ff'); }
        return false;
      }
      p.castT = 0;
      if (ab.id === 'blink') {
        /* Blink folds through stone -- that is the whole point of the spell --
           but it has to arrive somewhere you can stand. Walk the aim line from
           the farthest step back toward the caster and take the first landing
           that clears the rock by the body radius. If the aim is buried in a
           corner the spell simply fails, and costs nothing. */
        const a = p.aim;
        const reach = ab.reach || 9;
        const clear = p.r + 0.12;
        let tx = p.x, ty = p.y, landed = false;
        for (let s = reach; s >= 0.5; s -= 0.5) {
          const nx = p.x + Math.cos(a) * s, ny = p.y + Math.sin(a) * s;
          if (DC.fitsAt(world, nx, ny, clear)) { tx = nx; ty = ny; landed = true; break; }
        }
        if (!landed) {
          if (p.noManaT <= 0) { p.noManaT = 0.7; DC.Audio.play('empty'); }
          DC.Props.floater(world, p.x, p.y - p.r - 0.6, 'no room to fold', p.cls.color, { life: 0.9, size: 12 });
          game.log('The blink folds against the stone and gives nothing back.', 'rgba(210,220,235,0.55)');
          return false;
        }
        p.mp -= ab.mp;
        p.abilityCd = ab.cd;
        DC.Props.burst(world, p.x, p.y, 14, { color: [p.cls.color, '#ffffff'], spMin: 2, spMax: 6, lifeMin: 0.2, lifeMax: 0.5 });
        p.x = tx; p.y = ty;
        DC.Props.ring(world, p.x, p.y, 2.2, { color: p.cls.color, life: 0.35, width: 3 });
        DC.Audio.play('blink');
      } else {
        p.mp -= ab.mp;
        p.abilityCd = ab.cd;
      }
      if (ab.id === 'shieldwall') {
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
