/* Vector art for the delver, the demons, the boss, projectiles and particles. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const C = DC.C;
  const M = DC.M;

  DC.Render.actorShadow = function (ctx, x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.75, r * 1.05, r * 0.42, 0, 0, Math.PI * 2); ctx.fill();
  };

  /* A sword drawn along +x: a tapered blade that comes to a point, tinted by
     the steel you actually found. Everything else about a swing -- the arc, the
     ghost, the lean -- is drawn around this. */
  function bladePath(ctx, r, bl, bw, color) {
    ctx.fillStyle = color || '#cfd6e4';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -bw * 0.62);
    ctx.lineTo(bl - r * 0.18, -bw * 0.5);
    ctx.lineTo(bl, 0);
    ctx.lineTo(bl - r * 0.18, bw * 0.5);
    ctx.lineTo(r * 0.7, bw * 0.62);
    ctx.closePath();
    ctx.fill();
  }

  DC.Render.player = function (ctx, p, cam, input) {
    const s = cam.pxPerM;
    const x = cam.worldToScreenX(p.x), y = cam.worldToScreenY(p.y);
    const r = p.r * s;
    const cls = p.cls;

    // aim guide while the mouse is held down
    if (input.dragging) {
      const len = (cls.attackKind === 'melee' ? cls.reach : Math.min(24, cls.projSpeed * cls.projLife)) * s;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.aim);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(len, 0); ctx.stroke();
      ctx.setLineDash([]);
      if (cls.attackKind === 'melee') {
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.beginPath(); ctx.arc(0, 0, len, -cls.arc * Math.PI / 360, cls.arc * Math.PI / 360); ctx.stroke();
      }
      ctx.restore();
    }

    DC.Render.actorShadow(ctx, x, y, r);

    /* --- the swing -----------------------------------------------------
       A melee blow is not a hitbox that appears for a fifth of a second. It is
       a blade that has to travel: it cocks back, crosses the arc, and
       overshoots past the point where the hit actually landed. The damage is
       already resolved the instant the attack starts, so this is pure tell --
       which is exactly what makes a swing readable at a glance. */
    let bladeAng = p.aim, sk = 0, swinging = null;
    if (p.swing && cls.attackKind === 'melee') {
      const sw = p.swing;
      const dur = sw.dur || 0.2;
      sk = M.clamp(1 - sw.t / dur, 0, 1);
      const half = sw.arc * Math.PI / 360;
      if (sw.kind === 'whirl') {
        bladeAng = sw.dir + sk * Math.PI * 2;
      } else {
        const wind = 0.24;                    // the catch before the cast
        if (sk < wind) bladeAng = sw.dir - half * 1.3 * (sk / wind);
        else {
          const u = (sk - wind) / (1 - wind);
          const e = 1 - (1 - u) * (1 - u);    // out fast, off slow
          bladeAng = sw.dir + half * (-1.3 + 2.4 * e);
        }
      }
      swinging = p.swing;
    }

    /* The trail sits behind the edge, so the arc you can see is the arc you
       could have hit with: a filled wedge for the swept steel and a bright
       hairline for the edge itself. */
    if (swinging) {
      const half = swinging.arc * Math.PI / 360;
      const rad = swinging.reach * s * (0.72 + sk * 0.3);
      /* A trail, not a fan: the sweep is capped a little over a radian behind
         the edge, so it reads as steel in motion instead of a hit-zone decal
         painted over the whole arc. */
      const cock = swinging.dir - half * 1.3;
      let from;
      if (swinging.kind === 'whirl') {
        from = bladeAng - Math.min(sk * Math.PI * 2, Math.PI * 1.4);
      } else if (sk < 0.24) {
        from = bladeAng;                 // winding back: nothing has been swept yet
      } else {
        from = Math.max(bladeAng - 1.15, cock);
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = 0.3 * (1 - sk * 0.5);
      ctx.fillStyle = cls.color;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, rad, from, bladeAng);
      ctx.closePath(); ctx.fill();
      // the swept edge: a wide soft band in the career's colour, and a bright
      // hairline down the middle of it for the steel itself
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.5 * (1 - sk);
      ctx.strokeStyle = cls.color;
      ctx.lineWidth = Math.max(3, s * 0.24);
      ctx.beginPath(); ctx.arc(0, 0, rad, from, bladeAng); ctx.stroke();
      ctx.globalAlpha = 0.9 * (1 - sk);
      ctx.strokeStyle = '#f2f6ff';
      ctx.lineWidth = Math.max(1, s * 0.08);
      ctx.beginPath(); ctx.arc(0, 0, rad, from, bladeAng); ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y);
    if (swinging) {
      // The body goes with the blade: a lean into the swing, a short lunge on
      // the strike, and a whole turn for a whirlwind.
      const lean = swinging.kind === 'whirl'
        ? bladeAng - p.aim
        : M.clamp(bladeAng - p.aim, -1.2, 1.2) * 0.2;
      ctx.rotate(lean);
      const lunge = Math.sin(sk * Math.PI) * r * 0.18;
      ctx.translate(Math.cos(p.aim) * lunge, Math.sin(p.aim) * lunge);
    }
    if (p.invuln > 0 && Math.floor(p.invuln * 24) % 2 === 0) ctx.globalAlpha = 0.55;

    const bob = Math.sin(p.walk) * r * 0.08;
    // cloak
    ctx.fillStyle = cls.robe;
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, r * 0.9 + bob);
    ctx.quadraticCurveTo(-r * 0.7, -r * 0.9 + bob, 0, -r * 1.05 + bob);
    ctx.quadraticCurveTo(r * 0.7, -r * 0.9 + bob, r * 0.85, r * 0.9 + bob);
    ctx.closePath();
    ctx.fill();
    // hood
    ctx.fillStyle = cls.accent;
    ctx.beginPath(); ctx.arc(0, -r * 0.55 + bob, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0b0e14';
    ctx.beginPath(); ctx.arc(0, -r * 0.5 + bob, r * 0.3, 0, Math.PI * 2); ctx.fill();
    // class light
    ctx.fillStyle = cls.color;
    ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(0, -r * 0.5 + bob, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    /* The weapon. At rest it lies along the aim, because the aim is the one
       thing on screen that has to stay readable. Mid-swing it belongs to the
       swing instead, and it is drawn as a sword rather than a grey bar: grip,
       crossguard, and a blade that tapers to a point and is tinted by the
       steel you actually found. */
    ctx.save();
    ctx.rotate(swinging ? bladeAng : p.aim);
    if (cls.attackKind === 'melee') {
      const twoHanded = !!(p.weapon && p.weapon.weight === 2);
      const steel = (p.weapon && p.weapon.color) || '#cfd6e4';
      const bl = r * (twoHanded ? 2.05 : 1.72);
      const bw = r * (twoHanded ? 0.3 : 0.23);
      /* A blade a half-beat behind the blade: at 20 px per metre a swinging
         sword is otherwise a single thin line that the eye cannot follow. */
      if (swinging && sk > 0.2 && sk < 0.9) {
        ctx.save();
        ctx.globalAlpha = 0.28 * (1 - sk);
        ctx.rotate(-0.5);
        bladePath(ctx, r, bl, bw, steel);
        ctx.restore();
      }
      ctx.fillStyle = '#5d4a30';
      ctx.fillRect(r * 0.24, -bw * 0.5, r * 0.36, bw);
      ctx.fillStyle = '#454d5e';
      ctx.fillRect(r * 0.56, -r * 0.3, r * 0.16, r * 0.6);
      bladePath(ctx, r, bl, bw, steel);
      // the fuller: light running down the middle of the edge
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(r * 0.78, -bw * 0.16, bl - r * 0.96, bw * 0.3);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#8a6a3f';
      ctx.fillRect(r * 0.4, -r * 0.1, r * 1.1, r * 0.2);
      ctx.fillStyle = cls.color;
      ctx.beginPath(); ctx.arc(r * 1.6, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.arc(r * 1.6, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (p.shieldT > 0) {
      ctx.strokeStyle = 'rgba(201,212,232,' + (0.35 + 0.25 * Math.sin(p.anim * 9)) + ')';
      ctx.lineWidth = Math.max(2, s * 0.16);
      ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  };

  DC.Render.demon = function (ctx, d, cam) {
    const s = cam.pxPerM;
    const x = cam.worldToScreenX(d.x), y = cam.worldToScreenY(d.y);
    const r = d.r * s;
    const def = d.def;

    if (d.dead) {
      const k = M.clamp(1 - d.deadT / 1.6, 0, 1);
      if (k <= 0) return;
      ctx.save();
      ctx.globalAlpha = k * 0.5;
      ctx.fillStyle = '#4a1512';
      ctx.beginPath(); ctx.ellipse(x, y, r * (1.2 - k * 0.2), r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }

    DC.Render.actorShadow(ctx, x, y, r);

    // windup telegraph
    if (d.windup > 0 && def.attackKind === 'melee') {
      const k = 1 - d.windup / d.windupMax;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(d.aim == null ? d.facing : d.aim);
      ctx.fillStyle = 'rgba(255,92,92,' + (0.10 + k * 0.16) + ')';
      const reach = (def.id === 'gorewarden' ? def.reach + 1.2 : def.reach) * s;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, reach, -(def.arc * Math.PI / 360), def.arc * Math.PI / 360);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y);
    const bob = Math.sin(d.anim * 6) * r * 0.07;
    const body = d.hitFlash > 0 ? '#ffffff' : def.color;

    // body
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, bob * 0.4, r * 0.82, r * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();
    // shoulders / arms
    ctx.fillStyle = d.hitFlash > 0 ? '#ffffff' : def.accent;
    ctx.beginPath(); ctx.arc(-r * 0.72, -r * 0.15 + bob, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.72, -r * 0.15 + bob, r * 0.3, 0, Math.PI * 2); ctx.fill();
    // head
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(0, -r * 0.75 + bob, r * 0.44, 0, Math.PI * 2); ctx.fill();
    // horns
    ctx.strokeStyle = def.accent;
    ctx.lineWidth = Math.max(1.5, r * 0.16);
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 1.0 + bob);
    ctx.quadraticCurveTo(-r * 0.62, -r * 1.5 + bob, -r * 0.2, -r * 1.55 + bob);
    ctx.moveTo(r * 0.3, -r * 1.0 + bob);
    ctx.quadraticCurveTo(r * 0.62, -r * 1.5 + bob, r * 0.2, -r * 1.55 + bob);
    ctx.stroke();
    // eyes
    ctx.fillStyle = d.hasSeen ? '#ffe9b0' : 'rgba(255,233,176,0.55)';
    ctx.beginPath(); ctx.arc(-r * 0.17, -r * 0.78 + bob, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.17, -r * 0.78 + bob, r * 0.1, 0, Math.PI * 2); ctx.fill();

    // weapon tell
    ctx.save();
    ctx.rotate(d.aim == null ? d.facing : d.aim);
    if (def.attackKind === 'melee') {
      ctx.fillStyle = 'rgba(210,215,225,0.9)';
      ctx.fillRect(r * 0.6, -r * 0.1, r * (def.reach * 0.55), r * 0.2);
    } else {
      ctx.fillStyle = 'rgba(255,138,92,0.9)';
      ctx.beginPath(); ctx.arc(r * 0.95, 0, r * 0.26, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.restore();

    // health pip when damaged
    if (d.hp < d.maxHp) {
      const w = r * 1.8, h = 3;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - w / 2, y - r * 2.1, w, h);
      ctx.fillStyle = '#e0524b';
      ctx.fillRect(x - w / 2, y - r * 2.1, w * M.clamp(d.hp / d.maxHp, 0, 1), h);
    }
  };

  DC.Render.boss = function (ctx, b, cam) {
    const s = cam.pxPerM;
    const x = cam.worldToScreenX(b.x), y = cam.worldToScreenY(b.y);
    const r = b.r * s;
    const base = DC.BOSS[b.bossKind];
    const flash = b.hitFlash > 0;
    const body = flash ? '#ffffff' : base.body;
    const trim = flash ? '#ffffff' : base.color;

    DC.Render.actorShadow(ctx, x, y, r);

    if (!b.awake) {
      // dormant: a hunched mound with two slow-brightening eyes
      const br = 1 + 0.03 * Math.sin(b.sleepBreath * 1.2);
      const pulse = 0.25 + 0.2 * Math.sin(b.sleepBreath * 0.9);
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(10,12,18,0.96)';
      ctx.beginPath();
      ctx.moveTo(-r * 1.2, r * 0.85);
      ctx.quadraticCurveTo(-r * 1.05, -r * 0.95 * br, 0, -r * 1.05 * br);
      ctx.quadraticCurveTo(r * 1.05, -r * 0.95 * br, r * 1.2, r * 0.85);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,209,102,0.16)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = DC.rgba(trim, pulse * 0.8);
      ctx.beginPath(); ctx.arc(-r * 0.22, -r * 0.35, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.22, -r * 0.35, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }

    // telegraph
    if (b.windup > 0 && b.pending) {
      const k = 1 - b.windup / b.windupMax;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(255,92,92,' + (0.08 + k * 0.16) + ')';
      if (b.pending === (DC.Boss.ACTIONS && DC.Boss.ACTIONS.sweep)) {
        ctx.beginPath(); ctx.arc(0, 0, (b.r + 3.6) * s, -1.3, 1.3); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, (b.r + 4.8) * s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y);
    const bob = Math.sin(b.anim * 3.4) * r * 0.05;

    // heat haze so the thing reads as a threat even at the edge of the torch
    const aura = ctx.createRadialGradient(0, -r * 0.2, r * 0.3, 0, -r * 0.2, r * 2.1);
    aura.addColorStop(0, DC.rgba(b.enraged ? '#ff5c5c' : trim, 0.20));
    aura.addColorStop(1, DC.rgba(b.enraged ? '#ff5c5c' : trim, 0));
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 2.1, 0, Math.PI * 2); ctx.fill();

    // tattered mantle
    ctx.fillStyle = flash ? '#ffffff' : base.cape;
    ctx.beginPath();
    ctx.moveTo(-r * 1.18, r * 1.02 + bob);
    ctx.lineTo(-r * 0.92, r * 0.55 + bob);
    ctx.lineTo(-r * 1.02, r * 0.1 + bob);
    ctx.quadraticCurveTo(-r * 0.95, -r * 0.95 + bob, 0, -r * 1.12 + bob);
    ctx.quadraticCurveTo(r * 0.95, -r * 0.95 + bob, r * 1.02, r * 0.1 + bob);
    ctx.lineTo(r * 0.92, r * 0.55 + bob);
    ctx.lineTo(r * 1.18, r * 1.02 + bob);
    ctx.closePath(); ctx.fill();

    // torso: heavy shoulders, narrow waist
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-r * 0.78, r * 0.9 + bob);
    ctx.quadraticCurveTo(-r * 0.95, -r * 0.2 + bob, -r * 0.62, -r * 0.72 + bob);
    ctx.quadraticCurveTo(0, -r * 0.95 + bob, r * 0.62, -r * 0.72 + bob);
    ctx.quadraticCurveTo(r * 0.95, -r * 0.2 + bob, r * 0.78, r * 0.9 + bob);
    ctx.closePath(); ctx.fill();
    // ribs / plating
    ctx.strokeStyle = DC.rgba(trim, 0.35);
    ctx.lineWidth = Math.max(1, r * 0.05);
    for (let i = 0; i < 3; i++) {
      const yy = -r * 0.35 + i * r * 0.42 + bob;
      ctx.beginPath(); ctx.moveTo(-r * 0.5, yy); ctx.quadraticCurveTo(0, yy + r * 0.14, r * 0.5, yy); ctx.stroke();
    }

    // head, low and forward
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(0, -r * 0.92 + bob, r * 0.42, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();

    // horns, swept back
    ctx.strokeStyle = flash ? '#ffffff' : base.horn;
    ctx.lineWidth = Math.max(2, r * 0.13);
    ctx.lineCap = 'round';
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sgn * r * 0.3, -r * 1.12 + bob);
      ctx.quadraticCurveTo(sgn * r * 0.78, -r * 1.5 + bob, sgn * r * 0.52, -r * 1.95 + bob);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';

    // eyes
    const eye = b.enraged ? '#ffdede' : trim;
    ctx.fillStyle = DC.rgba(eye, 0.35);
    ctx.beginPath(); ctx.ellipse(0, -r * 0.92 + bob, r * 0.4, r * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = eye;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sgn * r * 0.17, -r * 0.95 + bob, r * 0.1, r * 0.06, sgn * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // jaw
    ctx.strokeStyle = DC.rgba(eye, 0.6);
    ctx.lineWidth = Math.max(1, r * 0.045);
    ctx.beginPath();
    ctx.moveTo(-r * 0.18, -r * 0.74 + bob);
    ctx.lineTo(-r * 0.06, -r * 0.66 + bob);
    ctx.lineTo(r * 0.06, -r * 0.74 + bob);
    ctx.lineTo(r * 0.18, -r * 0.66 + bob);
    ctx.stroke();

    // weapon
    ctx.save();
    ctx.rotate(b.aim);
    ctx.fillStyle = flash ? '#ffffff' : '#20242c';
    ctx.fillRect(r * 0.6, -r * 0.16, r * 1.7, r * 0.32);
    ctx.fillStyle = flash ? '#ffffff' : '#8e98a8';
    ctx.fillRect(r * 0.6, -r * 0.16, r * 1.7, Math.max(1, r * 0.08));
    ctx.fillStyle = flash ? '#ffffff' : base.horn;
    ctx.fillRect(r * 0.5, -r * 0.26, r * 0.18, r * 0.52);
    ctx.restore();
    ctx.restore();

    // name + bar, top centre: clear of the log stack at the bottom
    const w = Math.min(cam.w * 0.42, 460);
    const bx = cam.w / 2 - w / 2, by = 74;
    ctx.fillStyle = 'rgba(6,8,12,0.72)';
    ctx.fillRect(bx - 8, by - 24, w + 16, 46);
    ctx.strokeStyle = 'rgba(255,209,102,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - 7.5, by - 23.5, w + 15, 45);
    ctx.fillStyle = '#ffd166';
    ctx.font = '600 13px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(b.name, cam.w / 2, by - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(bx, by, w, 10);
    ctx.fillStyle = b.enraged ? '#ff5c5c' : '#e0524b';
    ctx.fillRect(bx, by, w * M.clamp(b.hp / b.maxHp, 0, 1), 10);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, 9);
    ctx.textAlign = 'left';
  };

  DC.Render.projectiles = function (ctx, world, cam, fog) {
    const p = world.actor;
    const s = cam.pxPerM;
    for (let i = 0; i < world.projectiles.length; i++) {
      const pr = world.projectiles[i];
      if (pr.side !== 'player' && !fog.visible(world, p, pr.x, pr.y, 1)) continue;
      const x = cam.worldToScreenX(pr.x), y = cam.worldToScreenY(pr.y);
      const r = pr.r * s;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
      g.addColorStop(0, pr.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, r * 0.75, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  };

  DC.Render.particles = function (ctx, world, cam) {
    const s = cam.pxPerM;
    const ps = world.particles;
    ctx.save();
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const k = M.clamp(p.life / p.maxLife, 0, 1);
      const x = cam.worldToScreenX(p.x), y = cam.worldToScreenY(p.y);
      if (p.kind === 'ring') {
        ctx.globalAlpha = k * 0.8;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.width || 2;
        ctx.beginPath(); ctx.arc(x, y, p.r * s, 0, Math.PI * 2); ctx.stroke();
        continue;
      }
      if (p.kind === 'glow') {
        ctx.globalCompositeOperation = 'lighter';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = k;
      ctx.fillStyle = p.color;
      const sz = Math.max(1, p.size * s * (0.5 + k * 0.5));
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
    ctx.restore();
  };

  DC.Render.floaters = function (ctx, world, cam) {
    const fs = world.floaters;
    ctx.save();
    ctx.textAlign = 'center';
    for (let i = 0; i < fs.length; i++) {
      const f = fs[i];
      const k = M.clamp(f.life / f.maxLife, 0, 1);
      const x = cam.worldToScreenX(f.x) + f.jitter, y = cam.worldToScreenY(f.y);
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.font = '600 ' + f.size + 'px ui-monospace, Menlo, monospace';
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillText(f.text, x + 1, y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, x, y);
    }
    ctx.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);
