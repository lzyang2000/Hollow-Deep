/* One place that decides how big everything is.
   The game is the same on a 27" monitor and on an iPhone held in one hand, but
   the numbers are not: a 300 px minimap is a quarter of a desktop and the whole
   width of a phone, and 20 px/m shows a comfortable 64 m of a 300 m floor on a
   desktop and only 19 m on a phone -- less than the torch reaches. So the
   viewport is measured once per resize and every panel reads from here.

   It is also the one place that decides where a thumb can reach. On a phone the
   lower half of the glass belongs to two sticks -- walk on the left, swing on
   the right -- and everything you look at rather than mash (the bag, the
   potions) moved up under the health bar, with the pause tab sitting on the
   corner of the map. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;
  const C = DC.C;

  const L = {
    w: 0, h: 0,
    touch: false, forceTouch: false, coarse: false,
    narrow: false, tiny: false,
    s: 1, pad: 16,
    minimapPx: C.MINIMAP_PX,
    zoomLevels: C.ZOOM_LEVELS.slice(),

    /* A coarse pointer is the honest signal, but it is not universal (a laptop
       with a touchscreen reports fine), so the game also treats a small window
       as touch-shaped, and ?touch=1 forces it for testing. */
    detect: function () {
      try {
        const q = new URLSearchParams(global.location && global.location.search);
        if (q.get('touch')) L.forceTouch = true;
      } catch (e) { /* no URLSearchParams */ }
      const nav = global.navigator;
      let coarse = false;
      try {
        coarse = !!('ontouchstart' in global) ||
          !!(nav && nav.maxTouchPoints > 0) ||
          !!(global.matchMedia && global.matchMedia('(pointer: coarse)').matches);
      } catch (e) { coarse = false; }
      L.coarse = coarse;
      return L;
    },

    recompute: function (w, h) {
      L.w = w; L.h = h;
      const mn = Math.min(w, h);
      L.touch = L.forceTouch || L.coarse || w < 640 || h < 480;
      L.narrow = w < 640 || h < 520;
      L.tiny = w < 470;
      L.pad = L.narrow ? 10 : 16;
      // Scale text down a little on a small screen, but never past the point
      // where a monospace glyph turns into porridge.
      L.s = M.clamp(mn / 720, 0.8, 1.12);

      // The minimap stays a minimap: about a third of the width, never taller
      // than the screen allows, never smaller than a readable square.
      L.minimapPx = Math.round(M.clamp(Math.min(w * 0.30, h * 0.42), 104, C.MINIMAP_PX));

      // Zoom: the short edge should always cover at least the torch diameter
      // (2 * REVEAL = 30 m), or the light you are standing in runs off the
      // screen and the fog eats the frame.
      const base = M.clamp(mn / 30, 9, C.PX_PER_M);
      L.zoomLevels = [
        Math.round(base * 0.7 * 10) / 10,
        Math.round(base * 10) / 10,
        Math.round(base * 1.3 * 10) / 10,
      ];
      return L;
    },

    /* Text size: scale with the screen, floor it so it stays legible. */
    font: function (px, floorPx) {
      const lo = floorPx === undefined ? 9 : floorPx;
      return Math.max(lo, Math.round(px * L.s));
    },

    /* ---------------- the vitals panel ----------------
       The HUD draws it, the bag and the potions line up under it, and the log
       keeps out of its way -- so the geometry lives here once. */
    vitals: function (game) {
      const narrow = L.narrow;
      const barH = narrow ? 15 : 16;
      const showGear = !narrow;
      const w = Math.round(Math.min(narrow ? 250 : 300, L.w * (narrow ? 0.64 : 0.42)));
      const h = 30 + barH * 2 + 12 + (showGear ? 18 : 0);
      return { x: L.pad, y: L.pad, w: w, h: h, barH: barH, showGear: showGear };
    },

    /* ---------------- the two sticks ----------------
       The lower half of the glass is split down the middle: the left thumb
       lands anywhere on its half and walks from wherever it landed, the right
       thumb lands anywhere on its half and swings for as long as it is held,
       pointing where it is pushed. A thumb never has to find a small circle in
       the dark, and the walk and the blow can point opposite ways because they
       come from different hands. The rings below are only where the sticks
       live when nobody is touching them. */
    sticks: function (game) {
      const r = L.tiny ? 34 : (L.narrow ? 42 : 48);
      const cy = L.h - L.pad - r - 2;
      return {
        r: r,
        band: Math.round(L.h * 0.52),
        move: { x: L.pad + r + 4, y: cy },
        attack: { x: L.w - L.pad - r - 4, y: cy },
      };
    },

    /* Which stick a point on the glass belongs to, or null for the open glass
       above them (that finger still walks AND aims, which is how one hand
       plays). Buttons are tested before this, so a thumb on a button is a
       thumb on a button. */
    zoneAt: function (game, mx, my) {
      if (!L.touch || !game || !game.player) return null;
      const s = L.sticks(game);
      if (my < s.band) return null;
      return mx < L.w / 2 ? 'move' : 'attack';
    },

    /* The two buttons beside the sticks: each one is the next thing the thumb
       that owns that stick needs. DODGE is a step, so it lives with the walk
       thumb; the career ability is an attack, so it lives with the swing
       thumb. */
    actions: function (game) {
      const acts = [];
      if (!L.touch || !game || !game.player) return acts;
      const p = game.player;
      acts.push({ id: 'dodge', label: 'DODGE', color: '#8ef0c0' });
      acts.push({ id: 'ability', label: p.cls.ability.name.split(' ')[0].slice(0, 6).toUpperCase(), big: true });
      if (game.interactTarget) {
        acts.push({
          id: 'interact',
          label: game.interactTarget.kind === 'merchant' ? 'TRADE' : 'DOWN',
          glow: true, pill: true,
        });
      }
      return acts;
    },

    /* The bag and the potions are things you look at, not things you mash in
       the middle of a fight, and the bottom of the screen now belongs to the
       sticks. They line up under the health bar instead. */
    utility: function (game) {
      const u = [];
      if (!L.touch || !game || !game.player) return u;
      const p = game.player;
      u.push({ id: 'pack', label: 'PACK', count: p.inv.length, countLabel: p.inv.length + '/' + p.invSize });
      u.push({ id: 'heal', label: 'HEAL', count: p.potions.heal | 0, countLabel: 'x' + (p.potions.heal | 0), color: '#ff6b6b' });
      u.push({ id: 'mana', label: 'MANA', count: p.potions.mana | 0, countLabel: 'x' + (p.potions.mana | 0), color: '#6bb6ff' });
      return u;
    },

    /* Pause on the corner of the map: the map is already the thing you tap to
       look at where you are, and its far corner is the one place on a phone
       that is never a stick or a thumb. */
    pauseButton: function (game) {
      if (!L.touch || !game || !game.player) return null;
      const r = L.tiny ? 15 : 17;
      const x0 = L.w - L.minimapPx - L.pad;
      const y0 = L.pad;
      return { id: 'pause', label: '', tab: true, x: x0 + r + 3, y: y0 + r + 3, r: r };
    },

    /* Everything a thumb can press, with its place. */
    buttons: function (game) {
      const out = [];
      if (!L.touch || !game || !game.player) return out;
      const s = L.sticks(game);
      const r = L.tiny ? 25 : 27;
      out.push({
        id: 'dodge', label: 'DODGE', color: '#8ef0c0',
        x: s.move.x + s.r + 10 + r, y: s.move.y, r: r,
      });
      const ab = game.player.cls.ability;
      out.push({
        id: 'ability', big: true, label: ab.name.split(' ')[0].slice(0, 6).toUpperCase(),
        x: s.attack.x - s.r - 10 - r, y: s.attack.y, r: r,
      });
      if (game.interactTarget) {
        // Above the swing stick, because that is the moment you stop swinging.
        out.push({
          id: 'interact', glow: true, pill: true, w: 96, h: 34, r: 17,
          label: game.interactTarget.kind === 'merchant' ? 'TRADE' : 'DOWN',
          x: s.attack.x, y: s.attack.y - s.r - 26,
        });
      }

      // The utility row under the health bar, wrapping before it reaches the
      // map so it can never slide under it.
      const V = L.vitals(game);
      const limit = Math.max(V.x + 120, L.w - L.minimapPx - L.pad - 10);
      const ph = 30;
      let px = V.x - 2, py = V.y + V.h + 4 + ph / 2;
      L.utility(game).forEach(function (b) {
        const w = 22 + b.label.length * 8 + (b.countLabel ? b.countLabel.length * 7 : 0);
        if (px + w > limit) { px = V.x - 2; py += ph + 6; }
        b.pill = true; b.w = w; b.h = ph; b.r = ph / 2; b.x = px + w / 2; b.y = py;
        px += w + 6;
        out.push(b);
      });

      const pb = L.pauseButton(game);
      if (pb) out.push(pb);
      return out;
    },

    hitButton: function (game, mx, my) {
      const bs = L.buttons(game);
      for (let i = 0; i < bs.length; i++) {
        const b = bs[i];
        const hw = b.w ? b.w / 2 : b.r, hh = b.h ? b.h / 2 : b.r;
        if (mx >= b.x - hw && mx <= b.x + hw && my >= b.y - hh && my <= b.y + hh) return b;
      }
      return null;
    },

    /* Where the bottom of the text can stop: the log gets out of the way of the
       sticks and the buttons around them, but not of the bag row up top. */
    actionTop: function (game) {
      if (!L.touch || !game || !game.player) return L.h;
      const s = L.sticks(game);
      let top = s.attack.y - s.r;
      const bs = L.buttons(game);
      for (let i = 0; i < bs.length; i++) {
        const b = bs[i];
        if (b.y < L.h * 0.5) continue;
        top = Math.min(top, b.y - (b.h ? b.h / 2 : b.r));
      }
      return top;
    },
  };

  DC.Layout = L;
})(typeof window !== 'undefined' ? window : globalThis);
