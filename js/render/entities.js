/* Vector art for the delver, the demons, the boss, projectiles and particles. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const C = DC.C;
  const M = DC.M;

  DC.Render.actorShadow = function (ctx, x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.72, r * 0.96, r * 0.37, 0, 0, Math.PI * 2); ctx.fill();
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

  /* The two delvers, drawn as two shapes rather than one shape in two
     colours. Up to now a mage and a knight were the same teardrop with a
     different fill, which is exactly why at the edge of the torch they read as
     the same sprite. Silhouette first: a knight is wide, low, and has pauldrons
     that stick out past his own body plus two legs that alternate; a mage is
     tall, narrow, has no legs at all, hovers, and trails a torn hem the way she
     is *not* going. Both look where they are going, which is the cheapest
     direction there is in a top-down game. */
  /* --- the two delvers -------------------------------------------------
     Two shapes, not one shape in two colours. A mage and a knight used to be
     the same teardrop with a different fill, which is exactly why at the edge
     of the torch they read as the same sprite. Silhouette first: a knight is
     wide, low, and has pauldrons that stick out past his own body plus two
     legs that alternate; a mage is tall, narrow, has no legs at all, hovers,
     and trails a torn hem the way she is *not* going. Both look where they are
     going, which is the cheapest direction there is in a top-down game.

     The second rule is value, not shape: the floor here is pale stone, so
     anything light is already half-lost against it. The knight's cloak and
     helm are dark and only the plate edge, the crest and the two points
     behind his visor are bright. A gradient object per actor per frame is not
     free either, so every "glow" on these two is two flat translucent layers.
     ----------------------------------------------------------------------- */
  function mageBody(ctx, p, r) {
    const cls = p.cls;
    const hover = Math.sin(p.anim * 2.4) * r * 0.07;
    const fx = Math.cos(p.facing), fy = Math.sin(p.facing);
    const sway = Math.sin(p.walk) * r * 0.09;
    // Cloth lags the body, so the hem points the way she came from.
    const dx = -fx * r * 0.22, dy = -fy * r * 0.15;
    const top = -r * 1.14 + hover;

    // Her own light on the floor.
    ctx.fillStyle = DC.rgba(cls.color, 0.08);
    ctx.beginPath(); ctx.ellipse(0, r * 0.72, r * 0.98, r * 0.36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = DC.rgba(cls.color, 0.12);
    ctx.beginPath(); ctx.ellipse(0, r * 0.72, r * 0.56, r * 0.21, 0, 0, Math.PI * 2); ctx.fill();

    // Robe: narrow at the shoulder, long, and torn along the hem. The hem sits
    // low enough to clear the shadow ellipse, otherwise the tears just read as
    // a dark skirt.
    const hemY = r * 0.94 + sway;
    ctx.fillStyle = cls.robe;
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, top + r * 0.3);
    ctx.quadraticCurveTo(-r * 0.7, top + r * 1.25, -r * 0.82 + dx, hemY + dy);
    for (let i = 1; i <= 6; i++) {
      const u = i / 6;
      ctx.lineTo(-r * 0.82 + r * 1.64 * u + dx, hemY + dy - (i % 2 ? r * 0.16 : 0));
    }
    ctx.quadraticCurveTo(r * 0.7, top + r * 1.25, r * 0.42, top + r * 0.3);
    ctx.closePath();
    ctx.fill();

    // The front band of the robe, the cord that holds it, and one fold of
    // light down the left -- three flat shapes that keep a nine-pixel figure
    // from becoming a flat blue triangle.
    ctx.fillStyle = cls.accent;
    ctx.beginPath();
    ctx.moveTo(-r * 0.15, top + r * 0.44);
    ctx.lineTo(r * 0.15, top + r * 0.44);
    ctx.lineTo(r * 0.11 + dx * 0.5, r * 0.72 + hemY * 0.25);
    ctx.lineTo(-r * 0.11 + dx * 0.5, r * 0.72 + hemY * 0.25);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = DC.rgba(cls.color, 0.5);
    ctx.beginPath(); ctx.arc(dx * 0.3, top + r * 0.62, r * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = DC.rgba(cls.color, 0.14);
    ctx.beginPath();
    ctx.moveTo(-r * 0.36, top + r * 0.5);
    ctx.lineTo(-r * 0.24, top + r * 0.52);
    ctx.lineTo(-r * 0.5 + dx * 0.7, hemY + dy - r * 0.2);
    ctx.lineTo(-r * 0.66 + dx * 0.7, hemY + dy - r * 0.24);
    ctx.closePath(); ctx.fill();

    // Cowl, peaked at the crown so the outline is not a perfect dome. The
    // opening sits toward where she is looking, which is what makes the head
    // read as turned rather than painted on.
    const hy = top + r * 0.16;
    ctx.fillStyle = cls.accent;
    ctx.beginPath();
    ctx.moveTo(-r * 0.44, hy + r * 0.36);
    ctx.quadraticCurveTo(-r * 0.5, hy - r * 0.4, -r * 0.06, hy - r * 0.56);
    ctx.lineTo(r * 0.06, hy - r * 0.54);
    ctx.quadraticCurveTo(r * 0.5, hy - r * 0.4, r * 0.44, hy + r * 0.36);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0b0e14';
    ctx.beginPath();
    ctx.ellipse(fx * r * 0.12, hy + fy * r * 0.1 + r * 0.04, r * 0.25, r * 0.21, 0, 0, Math.PI * 2);
    ctx.fill();
    // Two eyes rather than one dot: the difference between a blob and a face.
    ctx.fillStyle = cls.color;
    const ox = -fy * r * 0.11, oy = fx * r * 0.11;
    const ex = fx * r * 0.13, ey = hy + fy * r * 0.11 + r * 0.04;
    ctx.beginPath(); ctx.arc(ex + ox, ey + oy, r * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex - ox, ey - oy, r * 0.06, 0, Math.PI * 2); ctx.fill();
  }

  function knightBody(ctx, p, r) {
    const cls = p.cls;
    const fx = Math.cos(p.facing), fy = Math.sin(p.facing);
    const px = -fy, py = fx;
    const step = Math.sin(p.walk) * r * 0.28;
    const bob = Math.abs(Math.sin(p.walk)) * r * 0.05;
    const top = -r * 1.0 - bob;

    // Cloak, drawn first so the plate sits over it. It is dark on purpose: on
    // pale stone a pale cloak turns the whole figure into one washed blob. It
    // bulges away from the way he is going, which is the whole of the "he is
    // walking" cue.
    ctx.fillStyle = '#252a35';
    ctx.beginPath();
    ctx.ellipse(-fx * r * 0.46, -fy * r * 0.4 + r * 0.06, r * 0.74, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = DC.rgba(cls.accent, 0.4);
    ctx.beginPath();
    ctx.ellipse(-fx * r * 0.6, -fy * r * 0.52 + r * 0.06, r * 0.36, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs. Neither career used to have any at all.
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#2b3140';
      ctx.beginPath();
      ctx.ellipse(px * r * 0.28 * side + fx * step * side,
        py * r * 0.28 * side + fy * step * side + r * 0.62, r * 0.23, r * 0.19, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Breastplate: a barrel wider than it is tall. That is the silhouette.
    ctx.fillStyle = cls.robe;
    ctx.beginPath();
    ctx.moveTo(-r * 0.58, top + r * 0.34);
    ctx.quadraticCurveTo(-r * 0.72, top + r * 0.9, -r * 0.52, top + r * 1.24);
    ctx.lineTo(r * 0.52, top + r * 1.24);
    ctx.quadraticCurveTo(r * 0.72, top + r * 0.9, r * 0.58, top + r * 0.34);
    ctx.closePath(); ctx.fill();
    // light running down the left of the breast
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath();
    ctx.moveTo(-r * 0.46, top + r * 0.42); ctx.lineTo(-r * 0.28, top + r * 0.42);
    ctx.lineTo(-r * 0.32, top + r * 1.18); ctx.lineTo(-r * 0.49, top + r * 1.12);
    ctx.closePath(); ctx.fill();
    // tabard in the career's colour, then the belt that carries the weight
    ctx.fillStyle = DC.rgba(cls.color, 0.4);
    ctx.fillRect(-r * 0.13, top + r * 0.42, r * 0.26, r * 0.78);
    ctx.fillStyle = '#1c2028';
    ctx.fillRect(-r * 0.56, top + r * 1.02, r * 1.12, r * 0.16);
    ctx.fillStyle = '#8d9bb5';
    ctx.fillRect(-r * 0.09, top + r * 1.02, r * 0.18, r * 0.16);

    // Pauldrons: the shape that has to survive at nine pixels a metre, so they
    // stick out past the body -- but they are steel in shadow, not the brightest
    // thing on screen, or they read as two detached balls.
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#5c6779';
      ctx.beginPath();
      ctx.ellipse(side * r * 0.64, top + r * 0.46, r * 0.28, r * 0.24, side * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      ctx.beginPath();
      ctx.ellipse(side * r * 0.64, top + r * 0.37, r * 0.18, r * 0.075, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Helm: a dome, a slit, two lamp-points behind the slit, and a crest that
    // trails the way he came from. The crest is rust, not the career's pale
    // blue-grey, because a pale crest on pale stone is a white feather.
    const hy = top + r * 0.12;
    ctx.fillStyle = '#7e8ba3';
    ctx.beginPath(); ctx.arc(0, hy, r * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.beginPath(); ctx.ellipse(-r * 0.09, hy - r * 0.15, r * 0.2, r * 0.1, -0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#171b23';
    ctx.beginPath();
    ctx.ellipse(fx * r * 0.14, hy + fy * r * 0.1 + r * 0.08, r * 0.25, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cls.color;
    const mx = -fy * r * 0.11, my = fx * r * 0.11;
    const vx = fx * r * 0.15, vy = hy + fy * r * 0.1 + r * 0.08;
    ctx.beginPath(); ctx.arc(vx + mx, vy + my, r * 0.045, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(vx - mx, vy - my, r * 0.045, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = DC.rgba('#c2564a', 0.72);
    ctx.beginPath();
    ctx.moveTo(-r * 0.05, hy - r * 0.3);
    ctx.quadraticCurveTo(-fx * r * 0.5 - r * 0.1, hy - r * 0.6, -fx * r * 0.76, hy - r * 0.12);
    ctx.quadraticCurveTo(-r * 0.02, hy - r * 0.34, r * 0.06, hy - r * 0.3);
    ctx.closePath(); ctx.fill();
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

    /* A dash leaves a smear. The eye reads "moved fast" from a streak far better
       than from a body that is suddenly somewhere else -- and the smear is the
       tell that the dash is spent, which matters when the other side is reading
       you too. */
    if (p.dodgeT > 0) {
      const k = M.clamp(p.dodgeT / C.DODGE_TIME, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.34 * k;
      ctx.strokeStyle = cls.color;
      ctx.lineWidth = r * 1.15;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(p.dodgeDir) * 3.2 * s, y - Math.sin(p.dodgeDir) * 3.2 * s);
      ctx.lineTo(x, y);
      ctx.stroke();
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

    /* Everything below the waist is new. A mage has no legs and hovers; a
       knight has legs, pauldrons and a crest. The swing, the lean and the
       invulnerability flicker above still own the transform and the alpha. */
    if (cls.attackKind === 'melee') knightBody(ctx, p, r);
    else mageBody(ctx, p, r);

    /* The weapon. At rest it lies along the aim, because the aim is the one
       thing on screen that has to stay readable. Mid-swing it belongs to the
       swing instead, and it is drawn as a sword rather than a grey bar: grip,
       crossguard, and a blade that tapers to a point and is tinted by the
       steel you actually found. */
    careerWeapon(ctx, p, r, swinging, bladeAng, sk);

    if (p.shieldT > 0) {
      ctx.strokeStyle = 'rgba(201,212,232,' + (0.35 + 0.25 * Math.sin(p.anim * 9)) + ')';
      ctx.lineWidth = Math.max(2, s * 0.16);
      ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  };

  /* --- the three demons -------------------------------------------------
     They used to be one teardrop in three colours, which is how a player dies
     to something they were sure was an Imp. Each now owns its own silhouette,
     built to still read at the sixteen pixels a metre a phone hands you:

       Imp        head and limbs, almost no torso, a tail that will not hold
                  still, and an ember in its hands that never stops pulsing --
                  so even asleep it reads as the thing that throws fire.
       Hellblade  tall, lean, coat streaming behind it, and a blade longer
                  than its own body. The fastest thing in the dark, and it
                  looks like it.
       Gorewarden a slab. Pauldrons past its own body, greaves, a tower
                  shield on the off side and an axe on the near one. It is the
                  one that eats your first three swings.

     Colour is a bonus on top of that, never the tell. */
  function demonEyes(ctx, hx, hy, fx, fy, rad, seen, spread) {
    ctx.fillStyle = seen ? '#ffe9b0' : 'rgba(255,233,176,0.5)';
    const ox = -fy * spread, oy = fx * spread;
    const lx = hx + fx * rad * 0.6, ly = hy + fy * rad * 0.6;
    ctx.beginPath(); ctx.arc(lx + ox, ly + oy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(lx - ox, ly - oy, rad, 0, Math.PI * 2); ctx.fill();
  }

  /* One curve for every blade in the game. The delver's sword, a Hellblade's
     and a Sovereign's all swing on it: the steel cocks back through the
     windup, crosses the arc so that it points at the aim at the exact beat the
     damage lands, and overshoots past it. Damage is resolved the moment the
     blow is committed, so all of this is tell -- and a tell shaped like the
     thing that can hurt you is worth a great deal more than a ring that is not.

     phase 'wind'  : the windup is still running (the demon is cocking and
                     starting its cast; the hit has not landed yet)
     phase 'strike': the blow has landed and the blade is in the follow-through
     dir           : the aim frozen at the moment the blow was committed        */
  function swingState(sw) {
    const half = sw.arc * Math.PI / 360;
    const dur = sw.dur || 0.24;
    const u = M.clamp(1 - sw.t / dur, 0, 1);
    const cock = -half * 1.3;
    if (sw.phase === 'wind') {
      const c = 0.35;                       // the catch, then the cast
      if (u < c) return { ang: sw.dir + cock * (u / c), u, swept: false };
      const v = (u - c) / (1 - c);
      const e = 1 - (1 - v) * (1 - v);      // out fast, off slow
      return { ang: sw.dir + cock * (1 - e), u, swept: true };
    }
    const e2 = 1 - (1 - u) * (1 - u);
    return { ang: sw.dir + half * 1.1 * e2, u, swept: true };
  }

  /* The swept steel: a filled wedge behind the edge, a soft band along the
     rim, and a bright hairline for the blade itself -- the same three strokes
     the player's own swing uses, so a demon winding up reads as the same kind
     of threat the delver makes. */
  function swingTrail(ctx, x, y, sw, s, rad, color, alpha) {
    const st = swingState(sw);
    if (!st.swept) return st;
    const half = sw.arc * Math.PI / 360;
    const from = Math.max(st.ang - 1.15, sw.dir - half * 1.3);
    if (from >= st.ang) return st;
    const a = alpha == null ? 1 : alpha;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.26 * a;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.arc(0, 0, rad, from, st.ang);
    ctx.closePath(); ctx.fill();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.45 * a;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, s * 0.2);
    ctx.beginPath(); ctx.arc(0, 0, rad, from, st.ang); ctx.stroke();
    ctx.globalAlpha = 0.85 * a;
    ctx.strokeStyle = '#f2f6ff';
    ctx.lineWidth = Math.max(1, s * 0.07);
    ctx.beginPath(); ctx.arc(0, 0, rad, from, st.ang); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.globalAlpha = 1;
    ctx.restore();
    return st;
  }

  function impArt(ctx, d, r, body, accent) {
    const fx = Math.cos(d.facing), fy = Math.sin(d.facing);
    const px = -fy, py = fx;
    const sway = Math.sin(d.anim * 3.1);
    const cy = -Math.abs(Math.sin(d.anim * 5.2)) * r * 0.14;   // it never stops bouncing
    const step = Math.sin(d.anim * 8.4) * r * 0.18;

    // Tail: thin, whipped, always behind it.
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(1, r * 0.13);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-fx * r * 0.4, -fy * r * 0.4 + cy + r * 0.18);
    ctx.quadraticCurveTo(-fx * r * 1.05 + px * r * 0.55 * sway, -fy * r * 1.0 + py * r * 0.55 * sway + cy,
      -fx * r * 1.45 + px * r * 0.85 * sway, -fy * r * 1.35 + py * r * 0.85 * sway + cy - r * 0.3);
    ctx.stroke();

    // Legs: two thin shins mid-stride.
    for (const side of [-1, 1]) {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.ellipse(px * r * 0.2 * side + fx * step * side, py * r * 0.2 * side + r * 0.52 + cy,
        r * 0.14, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Torso: small, hunched, tipped into the direction of travel -- and
    // deliberately smaller than the head sitting on it.
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(fx * r * 0.12, fy * r * 0.1 + cy + r * 0.06, r * 0.38, r * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = DC.rgba(accent, 0.6);
    ctx.beginPath();
    ctx.ellipse(fx * r * 0.24, fy * r * 0.2 + cy + r * 0.12, r * 0.17, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms: too long for the body, and they hang forward.
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(px * r * 0.32 * side, py * r * 0.32 * side - r * 0.04 + cy);
      ctx.lineTo(fx * r * 0.6 + px * r * 0.3 * side, fy * r * 0.6 + py * r * 0.3 * side + r * 0.08 + cy);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';

    // Head: far too big for it. That is the whole Imp.
    const hx = fx * r * 0.18, hy = -r * 0.74 + fy * r * 0.14 + cy;
    ctx.fillStyle = accent;
    for (const side of [-1, 1]) {                       // ears, out and up
      ctx.beginPath();
      ctx.moveTo(hx + px * r * 0.34 * side, hy + py * r * 0.34 * side - r * 0.08);
      ctx.lineTo(hx + px * r * 0.84 * side, hy + py * r * 0.84 * side - r * 0.36);
      ctx.lineTo(hx + px * r * 0.4 * side, hy + py * r * 0.4 * side + r * 0.18);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(hx, hy, r * 0.47, 0, Math.PI * 2); ctx.fill();
    for (const side of [-1, 1]) {                       // two short horns
      ctx.beginPath();
      ctx.moveTo(hx + px * r * 0.16 * side - fx * r * 0.06, hy - r * 0.36);
      ctx.lineTo(hx + px * r * 0.3 * side, hy - r * 0.72);
      ctx.lineTo(hx + px * r * 0.02 * side, hy - r * 0.4);
      ctx.closePath(); ctx.fill();
    }
    demonEyes(ctx, hx, hy, fx, fy, r * 0.085, d.hasSeen, r * 0.15);

    // The ember. It pulses whether or not the Imp has seen you, which is how
    // a sleeping one still reads as the caster of the three.
    ctx.save();
    ctx.rotate(d.aim == null ? d.facing : d.aim);
    const flick = 0.82 + 0.18 * Math.sin(d.anim * 9.1) + 0.08 * Math.sin(d.anim * 21.3);
    ctx.fillStyle = DC.rgba('#ff9a5c', 0.16);
    ctx.beginPath(); ctx.arc(r * 0.76, 0, r * 0.44 * flick, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = d.hitFlash > 0 ? '#ffffff' : '#ffb066';
    ctx.beginPath(); ctx.arc(r * 0.76, 0, r * 0.21 * flick, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function hellbladeArt(ctx, d, r, body, accent, wpn) {
    const fx = Math.cos(d.facing), fy = Math.sin(d.facing);
    const px = -fy, py = fx;
    const step = Math.sin(d.anim * 9.2) * r * 0.3;
    const bob = Math.abs(Math.sin(d.anim * 9.2)) * r * 0.07;
    const top = -r * 1.04 - bob;

    // Coat tails streaming behind: the speed tell, and the only part of an
    // actor here that points at where it has been.
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-r * 0.34, r * 0.42 - bob);
    ctx.quadraticCurveTo(-fx * r * 1.1 - r * 0.16, -fy * r * 0.95 + r * 0.28 - bob,
      -fx * r * 1.55, -fy * r * 1.3 + r * 0.5 - bob);
    ctx.quadraticCurveTo(-fx * r * 0.7, r * 0.3 - bob, r * 0.32, r * 0.44 - bob);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = DC.rgba(body, 0.35);
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r * 0.34 - bob);
    ctx.quadraticCurveTo(-fx * r * 0.95, -fy * r * 0.8 + r * 0.3 - bob, -fx * r * 1.3, -fy * r * 1.05 + r * 0.5 - bob);
    ctx.quadraticCurveTo(-fx * r * 0.6, r * 0.3 - bob, r * 0.18, r * 0.36 - bob);
    ctx.closePath(); ctx.fill();

    // Legs: digitigrade, long in the stride.
    for (const side of [-1, 1]) {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.ellipse(px * r * 0.24 * side + fx * step * side, py * r * 0.24 * side + r * 0.72 - bob,
        r * 0.16, r * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Torso: narrow and long -- the tall silhouette of the three.
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-r * 0.26, top + r * 0.42);
    ctx.quadraticCurveTo(-r * 0.36, top + r * 0.92, -r * 0.2, top + r * 1.3);
    ctx.lineTo(r * 0.2, top + r * 1.3);
    ctx.quadraticCurveTo(r * 0.36, top + r * 0.92, r * 0.26, top + r * 0.42);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = DC.rgba('#ffffff', 0.1);
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, top + r * 0.5); ctx.lineTo(-r * 0.09, top + r * 0.5);
    ctx.lineTo(-r * 0.11, top + r * 1.22); ctx.lineTo(-r * 0.24, top + r * 1.16);
    ctx.closePath(); ctx.fill();

    // Arms: one forward on the blade, one back on the coat.
    ctx.strokeStyle = body;
    ctx.lineWidth = Math.max(1, r * 0.15);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-px * r * 0.26, -py * r * 0.26 + top + r * 0.5);
    ctx.lineTo(fx * r * 0.62 - px * r * 0.1, fy * r * 0.62 + top + r * 0.62);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Head: a narrow skull, crest swept back off the face.
    const hx = fx * r * 0.1, hy = top - r * 0.06;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(hx - r * 0.06, hy - r * 0.3);
    ctx.quadraticCurveTo(hx - fx * r * 0.55 - r * 0.12, hy - r * 0.62, hx - fx * r * 0.8, hy - r * 0.1);
    ctx.quadraticCurveTo(hx - r * 0.02, hy - r * 0.34, hx + r * 0.08, hy - r * 0.28);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(hx, hy, r * 0.3, r * 0.34, 0, 0, Math.PI * 2); ctx.fill();
    demonEyes(ctx, hx, hy, fx, fy, r * 0.075, d.hasSeen, r * 0.13);

    // The blade: longer than the demon holding it, and the reason you can pick
    // a Hellblade out of the dark at the far end of a corridor.
    ctx.save();
    ctx.rotate(wpn == null ? (d.aim == null ? d.facing : d.aim) : wpn);
    ctx.fillStyle = '#3a3f4c';
    ctx.fillRect(r * 0.2, -r * 0.09, r * 0.34, r * 0.18);
    ctx.fillStyle = accent;
    ctx.fillRect(r * 0.5, -r * 0.26, r * 0.13, r * 0.52);
    ctx.fillStyle = d.hitFlash > 0 ? '#ffffff' : '#d8dee9';
    ctx.beginPath();
    ctx.moveTo(r * 0.6, -r * 0.15);
    ctx.quadraticCurveTo(r * 1.5, -r * 0.2, r * 2.05, -r * 0.03);
    ctx.lineTo(r * 2.12, 0);
    ctx.lineTo(r * 2.05, r * 0.06);
    ctx.quadraticCurveTo(r * 1.5, r * 0.14, r * 0.6, r * 0.15);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(r * 0.7, -r * 0.06, r * 1.3, r * 0.05);
    ctx.restore();
  }

  function gorewardenArt(ctx, d, r, body, accent, wpn) {
    const fx = Math.cos(d.facing), fy = Math.sin(d.facing);
    const px = -fy, py = fx;
    const step = Math.sin(d.anim * 5.4) * r * 0.18;
    const bob = Math.abs(Math.sin(d.anim * 5.4)) * r * 0.04;
    const top = -r * 0.94 - bob;

    // Greaves, wide apart. It plants rather than strides.
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#2f2a2c';
      ctx.beginPath();
      ctx.ellipse(px * r * 0.34 * side + fx * step * side, py * r * 0.34 * side + r * 0.72,
        r * 0.26, r * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Tasset skirt over the hips.
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-r * 0.62, top + r * 1.02);
    ctx.lineTo(r * 0.62, top + r * 1.02);
    ctx.lineTo(r * 0.5, top + r * 1.42);
    ctx.lineTo(-r * 0.5, top + r * 1.42);
    ctx.closePath(); ctx.fill();

    // Torso: a barrel, wider than it is tall. The silhouette of the three.
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-r * 0.72, top + r * 0.3);
    ctx.quadraticCurveTo(-r * 0.86, top + r * 0.8, -r * 0.66, top + r * 1.1);
    ctx.lineTo(r * 0.66, top + r * 1.1);
    ctx.quadraticCurveTo(r * 0.86, top + r * 0.8, r * 0.72, top + r * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = DC.rgba('#ffffff', 0.08);
    ctx.beginPath();
    ctx.moveTo(-r * 0.58, top + r * 0.38); ctx.lineTo(-r * 0.34, top + r * 0.38);
    ctx.lineTo(-r * 0.4, top + r * 1.04); ctx.lineTo(-r * 0.62, top + r * 0.96);
    ctx.closePath(); ctx.fill();
    // the hide it wears, hanging off one shoulder
    ctx.fillStyle = DC.rgba('#6b3a2a', 0.55);
    ctx.beginPath();
    ctx.ellipse(-px * r * 0.3, -py * r * 0.3 + top + r * 0.62, r * 0.4, r * 0.3, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Pauldrons: slabs that stick out past the body, because that is the shape
    // that has to survive at nine pixels a metre.
    for (const side of [-1, 1]) {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(side * r * 0.5, top + r * 0.2);
      ctx.lineTo(side * r * 0.98, top + r * 0.3);
      ctx.lineTo(side * r * 0.94, top + r * 0.66);
      ctx.lineTo(side * r * 0.52, top + r * 0.6);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(side * r * 0.56, top + r * 0.24, side * r * 0.36, r * 0.07);
    }

    // Tower shield on the off hand: a rounded slab with a boss in it, held
    // out along the facing so you can see which side it is guarding.
    ctx.save();
    ctx.rotate(d.aim == null ? d.facing : d.aim);
    ctx.fillStyle = '#4a3b34';
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 1.02);
    ctx.lineTo(r * 0.42, -r * 0.96);
    ctx.lineTo(r * 0.46, -r * 0.12);
    ctx.lineTo(r * 0.2, r * 0.1);
    ctx.lineTo(r * -0.02, -r * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = DC.rgba(accent, 0.85);
    ctx.beginPath(); ctx.arc(r * 0.22, -r * 0.55, r * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Helm: sunk into the shoulders, brow ridge, two horns up and in.
    const hx = fx * r * 0.12, hy = top + r * 0.06;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(hx - r * 0.34, hy + r * 0.3);
    ctx.quadraticCurveTo(hx - r * 0.38, hy - r * 0.34, hx, hy - r * 0.4);
    ctx.quadraticCurveTo(hx + r * 0.38, hy - r * 0.34, hx + r * 0.34, hy + r * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#141014';
    ctx.beginPath();
    ctx.ellipse(hx + fx * r * 0.12, hy + fy * r * 0.1 + r * 0.04, r * 0.24, r * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    demonEyes(ctx, hx, hy, fx, fy, r * 0.06, d.hasSeen, r * 0.12);
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(1.5, r * 0.14);
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + side * r * 0.28, hy - r * 0.24);
      ctx.quadraticCurveTo(hx + side * r * 0.5, hy - r * 0.72, hx + side * r * 0.16, hy - r * 0.86);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';

    // Axe: a haft and a heavy head, drawn along the aim so the windup wedge
    // and the steel agree about where the blow is going to land.
    ctx.save();
    ctx.rotate(wpn == null ? (d.aim == null ? d.facing : d.aim) : wpn);
    ctx.fillStyle = '#54402c';
    ctx.fillRect(r * 0.3, -r * 0.09, r * 1.15, r * 0.18);
    ctx.fillStyle = d.hitFlash > 0 ? '#ffffff' : '#aab3c2';
    ctx.beginPath();
    ctx.moveTo(r * 1.16, -r * 0.5);
    ctx.quadraticCurveTo(r * 1.72, -r * 0.42, r * 1.66, r * 0.02);
    ctx.quadraticCurveTo(r * 1.6, r * 0.46, r * 1.16, r * 0.5);
    ctx.lineTo(r * 1.1, r * 0.16);
    ctx.lineTo(r * 1.1, -r * 0.16);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(r * 1.16, -r * 0.44, r * 0.4, r * 0.08);
    ctx.restore();
  }

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

    /* A demon's blade travels the way yours does. What used to mark a landed
       blow was an expanding ring -- a circle -- which is the shape of a slam
       or a shockwave, never of a sword. Now the steel cocks back, crosses its
       own arc and overshoots, and the wedge it sweeps is the wedge on the
       floor that was already telling you to step out of it. */
    const aim0 = d.aim == null ? d.facing : d.aim;
    let bladeAng = aim0, swinging = null, swU = 0;
    if (d.swing && def.attackKind === 'melee') {
      const st = swingState(d.swing);
      bladeAng = st.ang; swU = st.u; swinging = d.swing;
      swingTrail(ctx, x, y, swinging, s, swinging.reach * s * (0.72 + swU * 0.3), def.color, 1);
    }

    /* The windup wedge is the hit: same arc, same reach, drawn before the
       body so the thing standing in it is still visible. A Gorewarden's is
       150 degrees wide because that is exactly what its slam covers. */
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
    // The body goes with the blade: a lean into the swing, exactly as the
    // delver's does, so the tell is legible even where the steel is not.
    if (swinging) ctx.rotate(M.clamp(bladeAng - aim0, -1.2, 1.2) * 0.22);
    const body = d.hitFlash > 0 ? '#ffffff' : def.color;
    const accent = d.hitFlash > 0 ? '#ffffff' : def.accent;
    if (def.id === 'imp') impArt(ctx, d, r, body, accent);
    else if (def.id === 'gorewarden') gorewardenArt(ctx, d, r, body, accent, bladeAng);
    else hellbladeArt(ctx, d, r, body, accent, bladeAng);
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

  /* --- the three Sovereigns ----------------------------------------------
     A throne room should tell you what you are about to fight before it moves.
     The three used to be the same body in three paint jobs; now each one owns
     a shape, and the shape is the move set:

       knight     a wall of plate with a tower shield on the off side -- the
                  one it hurls at you from across the room. Low, broad, and
                  the crest trails the way it came from.
       swordsman  lean and tall under a long coat, twin blades, and the only
                  one of the three that looks like it can outrun you.
       mage       no legs at all. It hangs above the floor in a torn robe
                  with a burning rod, and the hem points where it has been.

     The dormant mound, the telegraph, the charge smear and the health bar are
     shared: those are the parts that have to be identical so you can read the
     danger rather than the costume. */
  function sovereignFace(ctx, b, r, base, flash, body, trim, hy, hornStyle) {
    // head
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(0, hy, r * 0.42, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();

    if (hornStyle === 'crown') {
      // The hood already owns the face, so a crowned Sovereign gets the bone
      // and nothing else.
      ctx.strokeStyle = flash ? '#ffffff' : base.horn;
      ctx.lineWidth = Math.max(2, r * 0.11);
      ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) {
        const bx = i * r * 0.19;
        ctx.beginPath();
        ctx.moveTo(bx, hy - r * 0.3);
        ctx.lineTo(bx + i * r * 0.03, hy - r * (0.52 + 0.11 * (2 - Math.abs(i))));
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      return;
    }
    ctx.strokeStyle = flash ? '#ffffff' : base.horn;
    ctx.lineWidth = Math.max(2, r * 0.13);
    ctx.lineCap = 'round';
    if (hornStyle === 'crown') {
      // A mage Sovereign wears bone like a mitre: five short spikes rather
      // than a pair of horns, so the head alone says "caster".
      for (let i = -2; i <= 2; i++) {
        const bx = i * r * 0.19;
        ctx.beginPath();
        ctx.moveTo(bx, hy - r * 0.3);
        ctx.lineTo(bx + i * r * 0.03, hy - r * (0.52 + 0.11 * (2 - Math.abs(i))));
        ctx.stroke();
      }
    } else if (hornStyle === 'swept') {
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sgn * r * 0.3, hy - r * 0.2);
        ctx.quadraticCurveTo(sgn * r * 0.86, hy - r * 0.5, sgn * r * 0.96, hy + r * 0.34);
        ctx.stroke();
      }
    } else {
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sgn * r * 0.3, hy - r * 0.2);
        ctx.quadraticCurveTo(sgn * r * 0.78, hy - r * 0.58, sgn * r * 0.52, hy - r * 1.03);
        ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';

    const eye = b.enraged ? '#ffdede' : trim;
    ctx.fillStyle = DC.rgba(eye, 0.35);
    ctx.beginPath(); ctx.ellipse(0, hy, r * 0.4, r * 0.26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = eye;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sgn * r * 0.17, hy - r * 0.03, r * 0.1, r * 0.06, sgn * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = DC.rgba(eye, 0.6);
    ctx.lineWidth = Math.max(1, r * 0.045);
    ctx.beginPath();
    ctx.moveTo(-r * 0.18, hy + r * 0.18);
    ctx.lineTo(-r * 0.06, hy + r * 0.26);
    ctx.lineTo(r * 0.06, hy + r * 0.18);
    ctx.lineTo(r * 0.18, hy + r * 0.26);
    ctx.stroke();
  }

  function sovereignKnight(ctx, b, r, base, flash, body, trim, bob, wpn) {
    const fx = Math.cos(b.facing), fy = Math.sin(b.facing);
    const px = -fy, py = fx;
    const step = Math.sin(b.anim * 2.6) * r * 0.2;

    // mantle, hung off the shoulders and dragged
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

    // legs in plate
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#1d2531';
      ctx.beginPath();
      ctx.ellipse(px * r * 0.4 * side + fx * step * side, py * r * 0.4 * side + r * 1.02 + bob,
        r * 0.3, r * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // torso: heavier than it is tall, which is the whole point
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-r * 0.86, r * 0.92 + bob);
    ctx.quadraticCurveTo(-r * 1.06, -r * 0.2 + bob, -r * 0.68, -r * 0.76 + bob);
    ctx.quadraticCurveTo(0, -r * 1.0 + bob, r * 0.68, -r * 0.76 + bob);
    ctx.quadraticCurveTo(r * 1.06, -r * 0.2 + bob, r * 0.86, r * 0.92 + bob);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = DC.rgba(trim, 0.35);
    ctx.lineWidth = Math.max(1, r * 0.05);
    for (let i = 0; i < 3; i++) {
      const yy = -r * 0.35 + i * r * 0.42 + bob;
      ctx.beginPath(); ctx.moveTo(-r * 0.56, yy); ctx.quadraticCurveTo(0, yy + r * 0.14, r * 0.56, yy); ctx.stroke();
    }
    // the tabard it was knighted in
    ctx.fillStyle = DC.rgba(trim, 0.22);
    ctx.fillRect(-r * 0.17, -r * 0.6 + bob, r * 0.34, r * 1.4);

    // pauldrons
    for (const side of [-1, 1]) {
      ctx.fillStyle = flash ? '#ffffff' : base.accent;
      ctx.beginPath();
      ctx.ellipse(side * r * 0.86, -r * 0.5 + bob, r * 0.34, r * 0.28, side * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.ellipse(side * r * 0.86, -r * 0.6 + bob, r * 0.22, r * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    sovereignFace(ctx, b, r, base, flash, body, trim, -r * 0.94 + bob, 'helm');
    // a great helm: the slit is a bar, and the crest is rust, not pale
    ctx.fillStyle = '#12161d';
    ctx.fillRect(-r * 0.32, -r * 1.18 + bob, r * 0.64, r * 0.1);
    ctx.fillStyle = DC.rgba('#c2564a', 0.75);
    ctx.beginPath();
    ctx.moveTo(-r * 0.06, -r * 1.26 + bob);
    ctx.quadraticCurveTo(-fx * r * 0.6 - r * 0.12, -r * 1.62 + bob, -fx * r * 0.9, -r * 1.1 + bob);
    ctx.quadraticCurveTo(-r * 0.02, -r * 1.3 + bob, r * 0.08, -r * 1.24 + bob);
    ctx.closePath(); ctx.fill();

    // shield on the off hand, then the sword along the aim
    ctx.save();
    ctx.rotate(b.aim);
    ctx.fillStyle = flash ? '#ffffff' : base.accent;
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 1.24);
    ctx.lineTo(r * 0.4, -r * 1.16);
    ctx.lineTo(r * 0.44, -r * 0.2);
    ctx.lineTo(r * 0.16, r * 0.12);
    ctx.lineTo(-r * 0.06, -r * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = DC.rgba(trim, 0.8);
    ctx.beginPath(); ctx.arc(r * 0.2, -r * 0.66, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.rotate(wpn == null ? b.aim : wpn);
    ctx.fillStyle = flash ? '#ffffff' : '#20242c';
    ctx.fillRect(r * 0.6, -r * 0.16, r * 1.7, r * 0.32);
    ctx.fillStyle = flash ? '#ffffff' : '#8e98a8';
    ctx.fillRect(r * 0.6, -r * 0.16, r * 1.7, Math.max(1, r * 0.08));
    ctx.fillStyle = flash ? '#ffffff' : base.horn;
    ctx.fillRect(r * 0.5, -r * 0.26, r * 0.18, r * 0.52);
    ctx.restore();
  }

  function sovereignBlade(ctx, b, r, base, flash, body, trim, bob, wpn) {
    const fx = Math.cos(b.facing), fy = Math.sin(b.facing);
    const step = Math.sin(b.anim * 3.6) * r * 0.3;
    const px = -fy, py = fx;

    // a long coat, split and streaming: the fast silhouette
    ctx.fillStyle = flash ? '#ffffff' : base.cape;
    ctx.beginPath();
    ctx.moveTo(-r * 0.62, r * 0.9 + bob);
    ctx.quadraticCurveTo(-fx * r * 1.3 - r * 0.2, -fy * r * 1.1 + r * 0.4 + bob,
      -fx * r * 1.7, -fy * r * 1.45 + r * 0.7 + bob);
    ctx.quadraticCurveTo(-fx * r * 0.8, r * 0.5 + bob, r * 0.5, r * 0.92 + bob);
    ctx.closePath(); ctx.fill();

    // legs, long in the stride
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#1a0f12';
      ctx.beginPath();
      ctx.ellipse(px * r * 0.3 * side + fx * step * side, py * r * 0.3 * side + r * 0.98 + bob,
        r * 0.22, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // torso: narrow and tall
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-r * 0.56, -r * 0.72 + bob);
    ctx.quadraticCurveTo(-r * 0.7, r * 0.1 + bob, -r * 0.44, r * 0.92 + bob);
    ctx.lineTo(r * 0.44, r * 0.92 + bob);
    ctx.quadraticCurveTo(r * 0.7, r * 0.1 + bob, r * 0.56, -r * 0.72 + bob);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = DC.rgba(trim, 0.3);
    ctx.lineWidth = Math.max(1, r * 0.05);
    for (let i = 0; i < 2; i++) {
      const yy = -r * 0.2 + i * r * 0.44 + bob;
      ctx.beginPath(); ctx.moveTo(-r * 0.4, yy); ctx.quadraticCurveTo(0, yy + r * 0.12, r * 0.4, yy); ctx.stroke();
    }
    // a baldric across the chest, holding the second sword on the back
    ctx.fillStyle = DC.rgba(trim, 0.3);
    ctx.save();
    ctx.rotate(0.6);
    ctx.fillRect(-r * 0.16, -r * 1.0 + bob, r * 0.3, r * 1.9);
    ctx.restore();
    // the sheathed blade, over the shoulder and behind
    ctx.save();
    ctx.rotate(b.facing + Math.PI * 0.78);
    ctx.fillStyle = flash ? '#ffffff' : '#2c2126';
    ctx.fillRect(r * 0.3, -r * 0.12, r * 1.5, r * 0.24);
    ctx.fillStyle = flash ? '#ffffff' : base.horn;
    ctx.fillRect(r * 0.24, -r * 0.2, r * 0.16, r * 0.4);
    ctx.restore();

    sovereignFace(ctx, b, r, base, flash, body, trim, -r * 0.98 + bob, 'swept');
    // a plume over the brow, trailing behind
    ctx.fillStyle = DC.rgba(trim, 0.5);
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 1.16 + bob);
    ctx.quadraticCurveTo(-fx * r * 0.9, -r * 1.5 + bob, -fx * r * 1.25, -r * 0.95 + bob);
    ctx.quadraticCurveTo(-r * 0.3, -r * 1.2 + bob, r * 0.26, -r * 1.14 + bob);
    ctx.closePath(); ctx.fill();

    // the drawn blade: long, single-edged, along the aim
    ctx.save();
    ctx.rotate(wpn == null ? b.aim : wpn);
    ctx.fillStyle = flash ? '#ffffff' : '#241a1e';
    ctx.fillRect(r * 0.34, -r * 0.1, r * 0.4, r * 0.2);
    ctx.fillStyle = flash ? '#ffffff' : base.horn;
    ctx.fillRect(r * 0.7, -r * 0.3, r * 0.14, r * 0.6);
    ctx.fillStyle = flash ? '#ffffff' : '#d9c3b0';
    ctx.beginPath();
    ctx.moveTo(r * 0.82, -r * 0.17);
    ctx.quadraticCurveTo(r * 1.9, -r * 0.22, r * 2.5, -r * 0.02);
    ctx.lineTo(r * 2.56, r * 0.02);
    ctx.quadraticCurveTo(r * 1.9, r * 0.14, r * 0.82, r * 0.17);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(r * 0.95, -r * 0.07, r * 1.5, r * 0.05);
    ctx.restore();
  }

  function sovereignMage(ctx, b, r, base, flash, body, trim, bob) {
    const fx = Math.cos(b.facing), fy = Math.sin(b.facing);
    const hover = Math.sin(b.anim * 1.9) * r * 0.1;
    const hem = r * 1.24 + hover;

    // No legs. The robe goes straight to the floor and the hem trails behind,
    // which is the one shape in this game that says "this one casts".
    ctx.fillStyle = flash ? '#ffffff' : base.cape;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.8 + hover);
    ctx.quadraticCurveTo(-r * 0.98, r * 0.2 + hover, -r * 1.12 - fx * r * 0.3, hem - fy * r * 0.2);
    for (let i = 1; i <= 7; i++) {
      const u = i / 7;
      ctx.lineTo(-r * 1.12 + r * 2.24 * u - fx * r * 0.3, hem - fy * r * 0.2 - (i % 2 ? r * 0.2 : 0));
    }
    ctx.quadraticCurveTo(r * 0.98, r * 0.2 + hover, r * 0.5, -r * 0.8 + hover);
    ctx.closePath(); ctx.fill();

    // sleeves, wide and empty, held up around the rod
    ctx.fillStyle = flash ? '#ffffff' : base.body;
    ctx.beginPath();
    ctx.moveTo(-r * 0.56, -r * 0.72 + hover);
    ctx.quadraticCurveTo(-r * 0.8, -r * 0.1 + hover, -r * 0.5, r * 0.5 + hover);
    ctx.lineTo(r * 0.5, r * 0.5 + hover);
    ctx.quadraticCurveTo(r * 0.8, -r * 0.1 + hover, r * 0.56, -r * 0.72 + hover);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = DC.rgba(trim, 0.18);
    ctx.fillRect(-r * 0.16, -r * 0.66 + hover, r * 0.32, r * 1.1);

    // the hood: a peak, and the face is a hole in it
    const hy = -r * 0.92 + hover;
    ctx.fillStyle = flash ? '#ffffff' : base.body;
    ctx.beginPath();
    ctx.moveTo(-r * 0.52, hy + r * 0.42);
    ctx.quadraticCurveTo(-r * 0.6, hy - r * 0.46, -r * 0.08, hy - r * 0.66);
    ctx.lineTo(r * 0.08, hy - r * 0.62);
    ctx.quadraticCurveTo(r * 0.6, hy - r * 0.46, r * 0.52, hy + r * 0.42);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0a0708';
    ctx.beginPath();
    ctx.ellipse(fx * r * 0.12, hy + fy * r * 0.1 + r * 0.06, r * 0.3, r * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    const eye = b.enraged ? '#ffdede' : trim;
    ctx.fillStyle = eye;
    const ox = -fy * r * 0.12, oy = fx * r * 0.12;
    ctx.beginPath(); ctx.arc(fx * r * 0.16 + ox, hy + fy * r * 0.14 + oy, r * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(fx * r * 0.16 - ox, hy + fy * r * 0.14 - oy, r * 0.07, 0, Math.PI * 2); ctx.fill();
    sovereignFace(ctx, b, r, base, flash, flash ? '#ffffff' : base.accent, trim, hy - r * 0.34, 'crown');

    // the rod, and a flame that is never the same size twice
    ctx.save();
    ctx.rotate(b.aim);
    ctx.fillStyle = flash ? '#ffffff' : '#4a3324';
    ctx.beginPath();
    ctx.moveTo(r * 0.3, -r * 0.13); ctx.lineTo(r * 2.0, -r * 0.09);
    ctx.lineTo(r * 2.0, r * 0.09); ctx.lineTo(r * 0.3, r * 0.13);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = flash ? '#ffffff' : base.horn;
    ctx.fillRect(r * 0.62, -r * 0.17, r * 0.2, r * 0.34);
    ctx.fillStyle = flash ? '#ffffff' : '#241a14';
    ctx.beginPath(); ctx.arc(r * 2.02, 0, r * 0.26, 0, Math.PI * 2); ctx.fill();
    const flick = 0.82 + 0.18 * Math.sin(b.anim * 8.4) + 0.09 * Math.sin(b.anim * 19.7);
    const fr = r * 0.3 * flick;
    ctx.fillStyle = DC.rgba(b.enraged ? '#ff5c5c' : trim, 0.2);
    ctx.beginPath(); ctx.arc(r * 2.06, 0, fr * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = DC.rgba(b.enraged ? '#ff8a5c' : trim, 0.7);
    ctx.beginPath(); ctx.arc(r * 2.06, 0, fr * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff2d8';
    ctx.beginPath(); ctx.arc(r * 2.06, 0, fr * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function sovereignArt(ctx, b, r, base, flash, body, trim, bob, wpn) {
    if (b.bossKind === 'mage') sovereignMage(ctx, b, r, base, flash, body, trim, bob);
    else if (b.bossKind === 'swordsman') sovereignBlade(ctx, b, r, base, flash, body, trim, bob, wpn);
    else sovereignKnight(ctx, b, r, base, flash, body, trim, bob, wpn);
  }

  /* The weapon, on its own so the career picker can draw the same rod or the
     same sword the game will. Nothing about it changes between the two: the
     swing owns the angle, the aim owns it at rest. */
  function careerWeapon(ctx, p, r, swinging, bladeAng, sk) {
    const cls = p.cls;
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
      ctx.globalAlpha = 0.26;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(r * 0.8, -bw * 0.13, bl - r * 1.0, bw * 0.26);
      ctx.globalAlpha = 1;
    } else {
      /* A taper on a gnarled rod. The flame is never the same size twice, and
         it is the only thing on the mage that moves on its own -- which is how
         she reads as a caster even standing still. */
      ctx.fillStyle = '#6b4f2c';
      ctx.beginPath();
      ctx.moveTo(r * 0.3, -r * 0.115); ctx.lineTo(r * 1.46, -r * 0.075);
      ctx.lineTo(r * 1.46, r * 0.075); ctx.lineTo(r * 0.3, r * 0.115);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a6a3f';
      ctx.fillRect(r * 0.46, -r * 0.14, r * 0.17, r * 0.28);   // binding
      ctx.fillStyle = '#3c3226';
      ctx.beginPath(); ctx.arc(r * 1.48, 0, r * 0.2, 0, Math.PI * 2); ctx.fill();
      const flick = 0.84 + 0.16 * Math.sin(p.anim * 11.3) + 0.07 * Math.sin(p.anim * 27.1);
      const fr = r * 0.25 * flick;
      ctx.fillStyle = DC.rgba(cls.color, 0.14);
      ctx.beginPath(); ctx.arc(r * 1.6, 0, fr * 2.0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = DC.rgba(cls.color, 0.55);
      ctx.beginPath(); ctx.arc(r * 1.6, 0, fr * 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#eaf6ff';
      ctx.beginPath(); ctx.arc(r * 1.6, 0, fr * 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /* A career drawn outside the game world. The picker used to show a colour
     swatch with a hat on it; it now shows the body you will actually play, at
     the same proportions, holding the weapon you will actually swing. */
  DC.Render.careerBody = function (ctx, cls, r, opts) {
    const o = opts || {};
    const t = o.t || 0;
    const p = {
      cls: cls, r: r,
      facing: o.facing == null ? -0.4 : o.facing,
      aim: o.aim == null ? 0 : o.aim,
      walk: o.walk == null ? t * 2.6 : o.walk,
      anim: o.anim == null ? t : o.anim,
      weapon: { weight: 1, color: '#cfd6e4' },
      invuln: 0, shieldT: 0, dodgeT: 0, swing: null,
    };
    DC.Render.actorShadow(ctx, 0, 0, r);
    if (cls.attackKind === 'melee') knightBody(ctx, p, r);
    else mageBody(ctx, p, r);
    careerWeapon(ctx, p, r, null, p.aim, 0);
  };
  DC.Render.careerBodies = { mage: mageBody, knight: knightBody };

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
        // The cut is 150 degrees wide -- and it is 150 degrees wide in the
        // direction it is facing, not due east. Without this the one telegraph
        // that was ever a wedge pointed wherever the screen's x axis happened
        // to be, which made the honest answer (step out of the wedge) wrong.
        ctx.rotate(b.aim);
        ctx.beginPath(); ctx.arc(0, 0, (b.r + 3.6) * s, -1.3, 1.3); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, (b.r + 4.8) * s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    /* A charge or a lunge is a straight line at you at twenty-plus metres a
       second. Without a smear behind it, it reads as a teleport, and the one
       thing a Sovereign's new reach needs is to be readable. */
    if (b.action === 'charge' || b.action === 'lunge') {
      const sp = Math.hypot(b.cvx, b.cvy) || 1;
      const ux = b.cvx / sp, uy = b.cvy / sp;
      const len = Math.min(9, sp * 0.45) * s;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const sg = ctx.createLinearGradient(x, y, x - ux * len, y - uy * len);
      const c = b.action === 'lunge' ? '#ff5c5c' : '#c9d4e8';
      sg.addColorStop(0, DC.rgba(c, 0.34)); sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg;
      const nx = -uy, ny = ux, w = r * 0.72;
      ctx.beginPath();
      ctx.moveTo(x + nx * w, y + ny * w);
      ctx.lineTo(x - nx * w, y - ny * w);
      ctx.lineTo(x - ux * len - nx * w * 0.25, y - uy * len - ny * w * 0.25);
      ctx.lineTo(x - ux * len + nx * w * 0.25, y - uy * len + ny * w * 0.25);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    /* The Sovereign's cut used to flash a ring out from its feet. A ring is
       the shape of the slam and the shockwave, never of a sword: the sweep is
       a 150 degree cut, and the blade now travels that cut the way the
       delver's own does -- cocked back through the windup, across on the beat
       the damage lands, and past it in the follow-through. */
    let bladeAng = b.aim, swinging = null, swU = 0;
    if (b.swing) {
      const st = swingState(b.swing);
      bladeAng = st.ang; swU = st.u; swinging = b.swing;
      swingTrail(ctx, x, y, swinging, s, swinging.reach * s * (0.72 + swU * 0.3), trim, 1);
    }

    ctx.save();
    ctx.translate(x, y);
    if (swinging) ctx.rotate(M.clamp(bladeAng - b.aim, -1.2, 1.2) * 0.2);
    const bob = Math.sin(b.anim * 3.4) * r * 0.05;

    // heat haze so the thing reads as a threat even at the edge of the torch
    const aura = ctx.createRadialGradient(0, -r * 0.2, r * 0.3, 0, -r * 0.2, r * 2.1);
    aura.addColorStop(0, DC.rgba(b.enraged ? '#ff5c5c' : trim, 0.20));
    aura.addColorStop(1, DC.rgba(b.enraged ? '#ff5c5c' : trim, 0));
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 2.1, 0, Math.PI * 2); ctx.fill();

    sovereignArt(ctx, b, r, base, flash, body, trim, bob, bladeAng);
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
      if (p.kind === 'arc') {
        const half = p.arc * Math.PI / 360;
        ctx.globalAlpha = k * 0.34;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.arc(x, y, p.r * s, p.aim - half, p.aim + half);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = k * 0.8;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.width || 3;
        ctx.beginPath(); ctx.arc(x, y, p.r * s, p.aim - half, p.aim + half); ctx.stroke();
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
