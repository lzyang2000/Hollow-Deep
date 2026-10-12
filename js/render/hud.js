/* Canvas HUD: vitals, stats, ability, potions, log, banners, prompts, and on a
   phone the whole one-hand action cluster. Sizes come from core/layout so the
   same HUD works on a desktop and on a phone held in one hand. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;

  DC.Render = DC.Render || {};
  const FONT = 'ui-monospace, Menlo, Consolas, monospace';

  function bar(ctx, x, y, w, h, frac, fill, back, label, value, fs) {
    ctx.fillStyle = back;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w * M.clamp(frac, 0, 1), h);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.font = '600 ' + fs + 'px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(label, x + 4, y + h - 4);
    ctx.textAlign = 'right';
    ctx.fillText(value, x + w - 4, y + h - 4);
    ctx.textAlign = 'left';
  }

  DC.Render.hud = function (ctx, game, cam) {
    const p = game.player, world = game.world;
    const L = DC.Layout;
    const W = cam.w, H = cam.h;
    const touch = L.touch;
    const narrow = L.narrow;
    ctx.save();

    /* ---- vitals, top left ---- */
    const panelX = L.pad, panelY = L.pad;
    const panelW = Math.round(Math.min(narrow ? 250 : 300, W * (narrow ? 0.64 : 0.42)));
    const fs = L.font(11, 10);
    const barH = narrow ? 15 : 16;
    const showGear = !narrow;
    const panelH = 30 + barH * 2 + 12 + (showGear ? 18 : 0);
    ctx.fillStyle = 'rgba(6,8,12,0.55)';
    ctx.fillRect(panelX - 6, panelY - 8, panelW + 12, panelH);
    ctx.font = '700 ' + L.font(13, 11) + 'px ' + FONT;
    ctx.fillStyle = p.cls.color;
    ctx.fillText(p.cls.name.toUpperCase(), panelX, panelY + 8);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.textAlign = 'right';
    ctx.fillText('DEPTH ' + world.depth, panelX + panelW, panelY + 8);
    ctx.textAlign = 'left';

    bar(ctx, panelX, panelY + 18, panelW, barH, p.hp / p.maxHp,
      p.hp / p.maxHp < 0.3 ? '#ff4d4d' : '#e0524b', 'rgba(60,20,20,0.75)',
      'HP', Math.ceil(p.hp) + '/' + p.maxHp, fs);
    bar(ctx, panelX, panelY + 18 + barH + 6, panelW, barH, p.mp / p.maxMp,
      '#4d8fd6', 'rgba(20,35,60,0.75)', 'MP', Math.floor(p.mp) + '/' + p.maxMp, fs);

    ctx.font = '600 ' + fs + 'px ' + FONT;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const stats = 'ATK ' + Math.round(p.atk) + '  DEF ' + Math.round(p.def) +
      '  SPD ' + p.speed.toFixed(1) + '  GOLD ' + p.gold;
    ctx.fillText(stats, panelX, panelY + 24 + barH * 2 + 12);
    if (showGear && (p.weapon || p.armor)) {
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      const w = p.weapon ? p.weapon.name : '\u2014';
      const a = p.armor ? p.armor.name : '\u2014';
      ctx.fillText(w.length > 22 ? w.slice(0, 21) + '\u2026' : w, panelX, panelY + 40 + barH * 2 + 12);
      ctx.textAlign = 'right';
      ctx.fillText(a.length > 22 ? a.slice(0, 21) + '\u2026' : a, panelX + panelW, panelY + 40 + barH * 2 + 12);
      ctx.textAlign = 'left';
    }

    /* ---- ability + potions, bottom left (mouse-and-keyboard only) ---- */
    const ab = p.cls.ability;
    if (!touch) {
      const bx = 16, by = H - 74;
      const cdFrac = M.clamp(1 - p.abilityCd / ab.cd, 0, 1);
      ctx.fillStyle = 'rgba(6,8,12,0.55)';
      ctx.fillRect(bx - 6, by - 22, 300, 84);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(bx, by, 46, 46);
      ctx.fillStyle = cdFrac >= 1 ? p.cls.color : 'rgba(255,255,255,0.35)';
      ctx.fillRect(bx, by + 46 * (1 - cdFrac), 46, 46 * cdFrac);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.strokeRect(bx + 0.5, by + 0.5, 45, 45);
      ctx.font = '700 10px ' + FONT;
      ctx.fillStyle = '#fff';
      ctx.fillText('SPACE', bx + 8, by + 40);
      ctx.font = '700 12px ' + FONT;
      ctx.fillStyle = cdFrac >= 1 ? '#fff' : 'rgba(255,255,255,0.5)';
      ctx.fillText(ab.name.toUpperCase(), bx + 58, by + 14);
      ctx.font = '600 10px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(ab.mp + ' MP' + (cdFrac < 1 ? '   ready in ' + Math.ceil(p.abilityCd) + 's' : '   ready'), bx + 58, by + 30);
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      const desc = ab.desc;
      ctx.fillText(desc.length > 46 ? desc.slice(0, 45) + '\u2026' : desc, bx + 58, by + 44);

      ctx.font = '700 11px ' + FONT;
      const py = by + 56;
      ctx.fillStyle = p.potions.heal > 0 ? '#ff6b6b' : 'rgba(255,255,255,0.25)';
      ctx.fillText('[1] HEAL x' + p.potions.heal, bx, py + 10);
      ctx.fillStyle = p.potions.mana > 0 ? '#6bb6ff' : 'rgba(255,255,255,0.25)';
      ctx.fillText('[2] MANA x' + p.potions.mana, bx + 110, py + 10);
      const packFull = DC.Inv.isFull(p);
      ctx.fillStyle = packFull ? '#ffd166' : 'rgba(255,255,255,0.4)';
      ctx.fillText('[I] PACK ' + p.inv.length + '/' + p.invSize, bx + 214, py + 10);
    }

    /* ---- log, bottom centre (clear of the thumb cluster on a phone) ---- */
    const logs = game.logs;
    const logBottom = touch ? L.actionTop(game) - 14 : H - 118;
    ctx.font = '600 ' + L.font(12, 10) + 'px ' + FONT;
    ctx.textAlign = 'center';
    for (let i = 0; i < logs.length; i++) {
      const l = logs[i];
      const k = M.clamp(l.life / l.maxLife, 0, 1);
      ctx.globalAlpha = Math.min(1, k * 2.2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(l.text, W / 2 + 1, logBottom - (logs.length - 1 - i) * 16 + 1);
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, W / 2, logBottom - (logs.length - 1 - i) * 16);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    /* ---- interact prompt ---- */
    const prompt = game.interactTarget;
    if (prompt) {
      const sx = cam.worldToScreenX(prompt.x), sy = cam.worldToScreenY(prompt.y) - 46;
      ctx.textAlign = 'center';
      ctx.font = '700 ' + L.font(13, 11) + 'px ' + FONT;
      const verb = touch ? 'TAP' : '[E]';
      const label = prompt.kind === 'merchant' ? verb + ' TRADE WITH THE MERCHANT' : verb + ' DESCEND';
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      const w = ctx.measureText(label).width + 18;
      ctx.fillRect(sx - w / 2, sy - 14, w, 22);
      ctx.fillStyle = prompt.kind === 'merchant' ? '#ffd166' : '#8ef0c0';
      ctx.fillText(label, sx, sy + 2);
      ctx.textAlign = 'left';
    }

    /* ---- banner ---- */
    if (game.banner && game.banner.life > 0) {
      const bn = game.banner;
      const k = M.clamp(bn.life / bn.maxLife, 0, 1);
      const a = Math.min(1, k * 3) * Math.min(1, (1 - k) * 6 + 0.2);
      ctx.globalAlpha = M.clamp(a, 0, 1);
      ctx.textAlign = 'center';
      ctx.font = '700 ' + L.font(26, 18) + 'px ' + FONT;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(bn.title, W / 2 + 2, H * 0.26 + 2);
      ctx.fillStyle = bn.color || '#fff';
      ctx.fillText(bn.title, W / 2, H * 0.26);
      if (bn.sub) {
        ctx.font = '600 ' + L.font(13, 10) + 'px ' + FONT;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        const subs = DC.UI.wrap(ctx, bn.sub, W - 40);
        for (let i = 0; i < Math.min(2, subs.length); i++) ctx.fillText(subs[i], W / 2, H * 0.26 + 26 + i * 16);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }

    /* ---- low HP vignette ---- */
    const hpFrac = p.hp / p.maxHp;
    if (hpFrac < 0.32 && !p.dead) {
      const pulse = 0.5 + 0.5 * Math.sin(game.time * 5.5);
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.62);
      g.addColorStop(0, 'rgba(255,0,0,0)');
      g.addColorStop(1, 'rgba(150,0,0,' + ((0.18 + pulse * 0.22) * (1 - hpFrac / 0.32)).toFixed(3) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    /* ---- reticle: the cursor, or the finger ---- */
    if (DC.Input.hasMouse) {
      const rx = DC.Input.mx, ry = DC.Input.my;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(rx, ry, 7, 0, Math.PI * 2);
      ctx.moveTo(rx - 12, ry); ctx.lineTo(rx - 9, ry);
      ctx.moveTo(rx + 9, ry); ctx.lineTo(rx + 12, ry);
      ctx.moveTo(rx, ry - 12); ctx.lineTo(rx, ry - 9);
      ctx.moveTo(rx, ry + 9); ctx.lineTo(rx, ry + 12);
      ctx.stroke();
    } else if (DC.Touch && DC.Touch.active) {
      /* On a phone the fingertip IS the cursor, so the drawing has to say so in
         three parts: a crosshair under the thumb, the aim ray leaving the body
         along the aim the swing will use, and -- only while the joystick is
         actually pulling -- the stick from where the finger landed to where it
         is now. The ray and the crosshair can never disagree, because the aim
         is measured from the body to exactly that point on the glass. */
      const px = cam.worldToScreenX(p.x), py = cam.worldToScreenY(p.y);
      const fx = DC.Touch.cx, fy = DC.Touch.cy;
      const aiming = !DC.Touch.attack;   // a thumb on ATTACK has no reticle

      if (DC.Input.touchX || DC.Input.touchY) {
        ctx.strokeStyle = 'rgba(255,255,255,0.16)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(DC.Touch.ox, DC.Touch.oy); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(DC.Touch.ox, DC.Touch.oy, 20, 0, Math.PI * 2); ctx.stroke();
      }

      const body = p.r * cam.pxPerM;
      const reach = p.cls.attackKind === 'melee'
        ? (p.cls.reach + 0.5) * cam.pxPerM
        : Math.min(11 * cam.pxPerM, 170);
      ctx.strokeStyle = 'rgba(255,179,71,' + (DC.Input.firing ? '0.62)' : '0.38)');
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(p.aim) * body, py + Math.sin(p.aim) * body);
      ctx.lineTo(px + Math.cos(p.aim) * (body + reach), py + Math.sin(p.aim) * (body + reach));
      ctx.stroke();
      ctx.setLineDash([]);

      if (aiming) {
        ctx.strokeStyle = 'rgba(255,255,255,0.62)';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(fx, fy, 9, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(fx - 15, fy); ctx.lineTo(fx - 11, fy);
        ctx.moveTo(fx + 11, fy); ctx.lineTo(fx + 15, fy);
        ctx.moveTo(fx, fy - 15); ctx.lineTo(fx, fy - 11);
        ctx.moveTo(fx, fy + 11); ctx.lineTo(fx, fy + 15);
        ctx.stroke();
      }
    }

    if (touch) DC.Render.actions(ctx, game, cam);
    ctx.restore();
  };

  /* The thumb cluster: circles big enough to hit without looking, each one
   * labelled, the ability ring filling as it recharges. */
  DC.Render.actions = function (ctx, game, cam) {
    const p = game.player;
    const bs = DC.Layout.buttons(game);
    const ab = p.cls.ability;
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      const r = b.r;
      let fill = 'rgba(8,11,17,0.62)';
      let edge = 'rgba(255,255,255,0.3)';
      let text = 'rgba(232,238,248,0.9)';
      if (b.id === 'attack') {
        edge = DC.Input.firing ? b.color : 'rgba(255,179,71,0.55)';
        if (DC.Input.firing) fill = 'rgba(48,32,10,0.78)';
      } else if (b.id === 'ability') {
        const ready = p.abilityCd <= 0 && p.mp >= ab.mp;
        edge = ready ? p.cls.color : 'rgba(255,255,255,0.22)';
        text = ready ? '#fff' : 'rgba(255,255,255,0.45)';
      } else if (b.id === 'heal' || b.id === 'mana') {
        if (!b.count) text = 'rgba(255,255,255,0.3)';
        else edge = b.color;
      } else if (b.id === 'interact') {
        edge = '#8ef0c0'; text = '#8ef0c0'; fill = 'rgba(20,40,32,0.72)';
      }
      ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = 2; ctx.stroke();

      if (b.id === 'ability') {
        const frac = M.clamp(1 - p.abilityCd / ab.cd, 0, 1);
        if (frac < 1) {
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.arc(b.x, b.y, r - 1, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
          ctx.closePath();
          ctx.fillStyle = 'rgba(255,255,255,0.09)';
          ctx.fill();
          ctx.font = '700 ' + DC.Layout.font(11, 10) + 'px ' + FONT;
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.fillText(Math.ceil(p.abilityCd) + 's', b.x, b.y - r + 14);
        }
      }

      ctx.textAlign = 'center';
      ctx.font = '700 ' + DC.Layout.font(b.id === 'ability' || b.id === 'attack' ? 10 : 9, 9) + 'px ' + FONT;
      ctx.fillStyle = text;
      ctx.fillText(b.label, b.x, b.y + 3);
      if (b.count !== undefined) {
        ctx.font = '700 ' + DC.Layout.font(11, 10) + 'px ' + FONT;
        ctx.fillStyle = b.count ? (b.color || '#fff') : 'rgba(255,255,255,0.28)';
        ctx.fillText('x' + b.count, b.x, b.y + r - 7);
      }
      ctx.textAlign = 'left';
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
