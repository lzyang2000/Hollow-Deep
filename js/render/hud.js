/* Canvas HUD: vitals, stats, ability, potions, log, banners, prompts. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;

  DC.Render = DC.Render || {};
  const FONT = 'ui-monospace, Menlo, Consolas, monospace';

  function bar(ctx, x, y, w, h, frac, fill, back, label, value) {
    ctx.fillStyle = back;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w * M.clamp(frac, 0, 1), h);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.font = '600 11px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(label, x + 4, y + h - 4);
    ctx.textAlign = 'right';
    ctx.fillText(value, x + w - 4, y + h - 4);
    ctx.textAlign = 'left';
  }

  DC.Render.hud = function (ctx, game, cam) {
    const p = game.player, world = game.world;
    const W = cam.w, H = cam.h;
    ctx.save();

    /* ---- vitals, top left ---- */
    const panelX = 16, panelY = 14;
    ctx.fillStyle = 'rgba(6,8,12,0.55)';
    ctx.fillRect(panelX - 6, panelY - 8, 300, 108);
    ctx.font = '700 13px ' + FONT;
    ctx.fillStyle = p.cls.color;
    ctx.fillText(p.cls.name.toUpperCase(), panelX, panelY + 8);
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.textAlign = 'right';
    ctx.fillText('DEPTH ' + world.depth, panelX + 288, panelY + 8);
    ctx.textAlign = 'left';

    bar(ctx, panelX, panelY + 18, 288, 16, p.hp / p.maxHp,
      p.hp / p.maxHp < 0.3 ? '#ff4d4d' : '#e0524b', 'rgba(60,20,20,0.75)',
      'HP', Math.ceil(p.hp) + '/' + p.maxHp);
    bar(ctx, panelX, panelY + 40, 288, 16, p.mp / p.maxMp,
      '#4d8fd6', 'rgba(20,35,60,0.75)', 'MP', Math.floor(p.mp) + '/' + p.maxMp);

    ctx.font = '600 11px ' + FONT;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const stats = 'ATK ' + Math.round(p.atk) + '   DEF ' + Math.round(p.def) +
      '   SPD ' + p.speed.toFixed(1) + '   GOLD ' + p.gold;
    ctx.fillText(stats, panelX, panelY + 76);
    if (p.weapon || p.armor) {
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      const w = p.weapon ? p.weapon.name : '\u2014';
      const a = p.armor ? p.armor.name : '\u2014';
      ctx.fillText(w.length > 22 ? w.slice(0, 21) + '\u2026' : w, panelX, panelY + 92);
      ctx.textAlign = 'right';
      ctx.fillText(a.length > 22 ? a.slice(0, 21) + '\u2026' : a, panelX + 288, panelY + 92);
      ctx.textAlign = 'left';
    }

    /* ---- ability + potions, bottom left ---- */
    const ab = p.cls.ability;
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

    // potions
    ctx.font = '700 11px ' + FONT;
    const py = by + 56;
    ctx.fillStyle = p.potions.heal > 0 ? '#ff6b6b' : 'rgba(255,255,255,0.25)';
    ctx.fillText('[1] HEAL x' + p.potions.heal, bx, py + 10);
    ctx.fillStyle = p.potions.mana > 0 ? '#6bb6ff' : 'rgba(255,255,255,0.25)';
    ctx.fillText('[2] MANA x' + p.potions.mana, bx + 110, py + 10);
    const packFull = DC.Inv.isFull(p);
    ctx.fillStyle = packFull ? '#ffd166' : 'rgba(255,255,255,0.4)';
    ctx.fillText('[I] PACK ' + p.inv.length + '/' + p.invSize, bx + 214, py + 10);

    /* ---- log, bottom centre ---- */
    const logs = game.logs;
    ctx.font = '600 12px ' + FONT;
    ctx.textAlign = 'center';
    for (let i = 0; i < logs.length; i++) {
      const l = logs[i];
      const k = M.clamp(l.life / l.maxLife, 0, 1);
      ctx.globalAlpha = Math.min(1, k * 2.2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(l.text, W / 2 + 1, H - 118 + i * 16 + 1);
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, W / 2, H - 118 + i * 16);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';

    /* ---- interact prompt ---- */
    const prompt = game.interactTarget;
    if (prompt) {
      const sx = cam.worldToScreenX(prompt.x), sy = cam.worldToScreenY(prompt.y) - 46;
      ctx.textAlign = 'center';
      ctx.font = '700 13px ' + FONT;
      const label = prompt.kind === 'merchant' ? '[E] TRADE WITH THE MERCHANT' : '[E] DESCEND';
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
      ctx.font = '700 26px ' + FONT;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(bn.title, W / 2 + 2, H * 0.26 + 2);
      ctx.fillStyle = bn.color || '#fff';
      ctx.fillText(bn.title, W / 2, H * 0.26);
      if (bn.sub) {
        ctx.font = '600 13px ' + FONT;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillText(bn.sub, W / 2, H * 0.26 + 26);
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
      g.addColorStop(1, 'rgba(150,0,0,' + (0.18 + pulse * 0.22) * (1 - hpFrac / 0.32) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    /* ---- reticle ---- */
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
    }
    ctx.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);
