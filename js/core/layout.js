/* One place that decides how big everything is.
   The game is the same on a 27" monitor and on an iPhone held in one hand, but
   the numbers are not: a 300 px minimap is a quarter of a desktop and the whole
   width of a phone, and 20 px/m shows a comfortable 64 m of a 300 m floor on a
   desktop and only 19 m on a phone -- less than the torch reaches. So the
   viewport is measured once per resize and every panel reads from here. */
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

    /* ---------------- one-hand action cluster ----------------
       Everything the thumb has to reach lives in the bottom-right corner, in
       reading order from the corner outward: ability first (the one you use
       constantly), then trade, potions, pack, pause. On a phone turned
       sideways the cluster goes in one row so it never hides under the
       minimap. */
    actions: function (game) {
      const acts = [];
      if (!L.touch || !game || !game.player) return acts;
      const p = game.player;
      // Corner-most, because it is the one control a drag cannot replace: a
      // drag always walks, so this is how you swing without moving.
      acts.push({ id: 'attack', label: 'ATTACK', color: '#ffb347' });
      acts.push({ id: 'ability', label: p.cls.ability.name.split(' ')[0].slice(0, 6).toUpperCase(), big: true });
      if (game.interactTarget) {
        acts.push({ id: 'interact', label: game.interactTarget.kind === 'merchant' ? 'TRADE' : 'DOWN', glow: true });
      }
      acts.push({ id: 'heal', label: 'HEAL', count: p.potions.heal | 0, color: '#ff6b6b' });
      acts.push({ id: 'mana', label: 'MANA', count: p.potions.mana | 0, color: '#6bb6ff' });
      acts.push({ id: 'pack', label: 'PACK', count: p.inv.length });
      acts.push({ id: 'pause', label: 'PAUSE' });
      return acts;
    },

    /* The cluster plus the left-hand aim stick, drawn as a wide ATTACK pad.
       Two thumbs, two sticks: the right one drags the field and walks, the left
       one rests on this pad, holds it to swing and slides it to point. One thumb
       still works -- the pad is only a second way to reach the same hold-button,
       and with nothing on it the field finger keeps aiming as it always did. */
    buttons: function (game) {
      const acts = L.actions(game);
      const out = [];
      if (!acts.length) return out;
      const r = L.tiny ? 25 : 27;
      const cell = (r + 9) * 2;
      const cols = L.h < 520 ? acts.length : 2;
      for (let i = 0; i < acts.length; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        const a = acts[i];
        a.x = L.w - L.pad - r - col * cell;
        a.y = L.h - L.pad - r - row * cell;
        a.r = r;
        out.push(a);
      }
      const pw = L.tiny ? 96 : 124, ph = 46;
      out.push({
        id: 'attack', label: 'ATTACK', color: '#ffb347', pad: true, hint: 'drag to aim',
        x: L.pad + pw / 2, y: L.h - L.pad - ph / 2, w: pw, h: ph, r: ph / 2,
      });
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

    /* Where the action cluster sits, so the log can get out of its way. */
    actionTop: function (game) {
      const bs = L.buttons(game);
      if (!bs.length) return L.h;
      let top = L.h;
      for (let i = 0; i < bs.length; i++) {
        top = Math.min(top, bs[i].y - (bs[i].h ? bs[i].h / 2 : bs[i].r));
      }
      return top;
    },
  };

  DC.Layout = L;
})(typeof window !== 'undefined' ? window : globalThis);
