/* The run: state machine, fixed-step simulation, level flow, rewards, death. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const C = DC.C;
  const M = DC.M;

  const G = {
    cam: DC.Camera,
    state: 'boot', time: 0, seed: 0, rng: null,
    player: null, world: null, depth: 1,
    logs: [], banner: null, stats: null, best: null,
    shop: null, loreCard: null, hoverClass: null, interactTarget: null,
    transition: null, deathCause: '', heartT: 0, hoverShop: -1,

    /* ---------------- boot ---------------- */
    init: function () {
      G.canvas = document.getElementById('game');
      G.ctx = G.canvas.getContext('2d');
      DC.Fog.init(document);
      G.resize();
      global.addEventListener('resize', function () { G.resize(); });

      DC.Input.init(G.canvas);
      G.canvas.addEventListener('click', function (e) {
        const r = G.canvas.getBoundingClientRect();
        G.onClick(e.clientX - r.left, e.clientY - r.top);
      });
      G.canvas.addEventListener('mousemove', function (e) {
        const r = G.canvas.getBoundingClientRect();
        G.onMove(e.clientX - r.left, e.clientY - r.top);
      });
      global.addEventListener('keydown', function (e) { G.onKey(e.code, e); });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden && G.state === 'playing') G.setState('pause');
      });

      G.best = G.loadBest();
      G.seed = (Date.now() ^ 0x5f3759df) >>> 0;
      G.rng = new DC.RNG(G.seed);
      G.setState('title');

      // Dev flag: index.html?auto=mage&depth=10 jumps straight into a run, and
      // ?select=1 opens the career screen. Handy for screenshots and balance
      // spot-checks; it never runs without the query string.
      try {
        const q = new URLSearchParams(global.location.search);
        if (q.get('select')) { G.setState('classSelect'); G.hoverClass = 'mage'; }
        if (q.get('auto')) {
          const cls = DC.CLASSES[q.get('auto')] ? q.get('auto') : 'mage';
          const d = Math.max(1, parseInt(q.get('depth') || '1', 10) || 1);
          G.newRun(cls, d);
        }
      } catch (e) { /* no URLSearchParams on very old browsers */ }
      G.last = null; G.acc = 0;
      requestAnimationFrame(G.loop);
    },

    resize: function () {
      const dpr = Math.min(2, global.devicePixelRatio || 1);
      const cssW = Math.max(320, global.innerWidth);
      const cssH = Math.max(240, global.innerHeight);
      G.dpr = dpr;
      G.canvas.width = Math.round(cssW * dpr);
      G.canvas.height = Math.round(cssH * dpr);
      G.canvas.style.width = cssW + 'px';
      G.canvas.style.height = cssH + 'px';
      G.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      DC.Camera.setViewport(cssW, cssH);
    },

    loadBest: function () {
      try {
        const raw = global.localStorage && global.localStorage.getItem('hollowdeep.best');
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    saveBest: function () {
      try {
        if (!global.localStorage) return;
        if (!G.best || G.depth > G.best.depth) {
          global.localStorage.setItem('hollowdeep.best', JSON.stringify({ depth: G.depth, cls: G.player ? G.player.classId : '' }));
          G.best = { depth: G.depth, cls: G.player ? G.player.classId : '' };
        }
      } catch (e) { /* file:// may block storage */ }
    },

    setState: function (s) {
      G.state = s;
      DC.Input.firing = false;
      DC.Input.dragging = false;
      if (s === 'playing') DC.Input.keys = Object.create(null);
    },

    /* ---------------- run ---------------- */
    newRun: function (classId, startDepth) {
      G.seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
      G.rng = new DC.RNG(G.seed);
      G.depth = Math.max(1, startDepth | 0) || 1;
      G.player = DC.Player.create(classId);
      G.stats = { kills: 0, goldEarned: 0, time: 0, meleeHits: 0, chests: 0, potions: 0 };
      G.logs = [];
      G.addItem(DC.makePotion('heal'));
      G.startLevel(G.depth, true);
      G.setState('playing');
      DC.Audio.resume();
      DC.Audio.setDepth(G.depth);
      DC.Audio.setScene('dungeon');
      G.log('You step off the last stair. The taper holds.', 'rgba(210,220,235,0.7)');
    },

    startLevel: function (depth, first) {
      G.depth = depth;
      const levelRng = new DC.RNG((G.seed ^ (depth * 0x9e3779b9)) >>> 0);
      const world = DC.levels.build(depth, levelRng, G.player);
      G.world = world;
      world.actor = G.player;
      G.player.x = world.start.x;
      G.player.y = world.start.y;
      G.player.kx = 0; G.player.ky = 0;
      G.interactTarget = null;
      DC.Render.pickPalette(depth);
      DC.Camera.snap(G.player);
      DC.Audio.setDepth(depth);
      DC.Audio.setScene(world.isBoss ? 'boss' : 'dungeon');

      if (world.isBoss) {
        G.banner = { title: world.boss.name, sub: world.boss.line, life: 4.2, maxLife: 4.2, color: '#ffd166' };
        G.log('A merchant sits at the edge of this room, unbothered.', '#ffd166');
      } else {
        G.banner = { title: DC.levelName(depth), sub: first ? 'Find the portal. Stay lit.' : DC.LORE.portalLine, life: 3.0, maxLife: 3.0, color: '#e8eef8' };
      }

      const frag = DC.LORE.fragments.filter(function (f) { return f.depth === depth; })[0];
      if (frag) G.loreCard = { depth: depth, text: frag.text };
    },

    descend: function () {
      if (G.transition) return;
      DC.Audio.play('levelDown');
      G.beginTransition(function () {
        G.startLevel(G.depth + 1);
        if (G.loreCard) { G.pendingLore = true; }
      });
    },

    beginTransition: function (fn) {
      G.transition = { t: 0, dur: 1.0, fn: fn };
    },

    /* ---------------- rewards ---------------- */
    log: function (text, color) {
      G.logs.push({ text: text, color: color || '#e8eef8', life: 3.4, maxLife: 3.4 });
      if (G.logs.length > 5) G.logs.shift();
    },

    addGold: function (n) {
      G.player.gold += n;
      G.stats.goldEarned += n;
      DC.Audio.play('coin');
    },

    addItem: function (item) {
      if (item.type === 'potion') {
        G.player.potions[item.key] = (G.player.potions[item.key] || 0) + 1;
        return { text: 'Got ' + item.name, color: item.color };
      }
      return G.applyItem(item);
    },

    applyItem: function (item) {
      const p = G.player;
      if (item.type === 'weapon') {
        if (!p.weapon || item.atk > p.weapon.atk) {
          let msg = 'Equipped ' + item.name + ' (+' + item.atk + ' ATK)';
          if (p.weapon) {
            const melt = Math.round(p.weapon.value * 0.5);
            p.gold += melt; G.stats.goldEarned += melt;
            msg += ' \u00b7 sold old for ' + melt;
          }
          p.weapon = item;
          p.bonusAtk = item.atk;
          DC.Player.recalc(p);
          DC.Audio.play('levelUp');
          return { text: msg, color: item.color };
        }
        p.gold += item.value; G.stats.goldEarned += item.value;
        DC.Audio.play('coin');
        return { text: 'Melted ' + item.name + ' for ' + item.value + ' coin', color: 'rgba(255,255,255,0.55)' };
      }
      if (item.type === 'armor') {
        if (!p.armor || item.def > p.armor.def) {
          let msg = 'Equipped ' + item.name + ' (+' + item.def + ' DEF)';
          if (p.armor) {
            const melt = Math.round(p.armor.value * 0.5);
            p.gold += melt; G.stats.goldEarned += melt;
            msg += ' \u00b7 sold old for ' + melt;
          }
          p.armor = item;
          p.bonusDef = item.def;
          DC.Player.recalc(p);
          DC.Audio.play('levelUp');
          return { text: msg, color: item.color };
        }
        p.gold += item.value; G.stats.goldEarned += item.value;
        DC.Audio.play('coin');
        return { text: 'Melted ' + item.name + ' for ' + item.value + ' coin', color: 'rgba(255,255,255,0.55)' };
      }
      return { text: 'Found ' + item.name, color: item.color };
    },

    applyUpgrade: function (up) {
      const p = G.player;
      const map = {
        moveSpeed: { key: 'bonusMove', cap: 2.2, fmt: function (v) { return '+' + v.toFixed(2) + ' m/s movement'; } },
        attackSpeed: { key: 'bonusAtkSpeed', cap: 0.9, fmt: function (v) { return '+' + Math.round(v * 100) + '% attack speed'; } },
        maxHp: { key: 'bonusHp', cap: 260, fmt: function (v) { return '+' + Math.round(v) + ' max HP'; } },
        maxMp: { key: 'bonusMp', cap: 220, fmt: function (v) { return '+' + Math.round(v) + ' max MP'; } },
      };
      const m = map[up.stat];
      if (!m) return 'Found ' + up.name;
      if (p[m.key] >= m.cap) {
        p.gold += 70; G.stats.goldEarned += 70;
        DC.Audio.play('coin');
        return up.label + ' maxed \u00b7 sold for 70 coin';
      }
      p[m.key] = Math.min(m.cap, p[m.key] + up.amount);
      if (up.stat === 'maxHp') p.hp += up.amount;
      if (up.stat === 'maxMp') p.mp += up.amount;
      DC.Player.recalc(p);
      DC.Audio.play('levelUp');
      return m.fmt(up.amount) + ' (' + up.name + ')';
    },

    /* ---------------- boss / death ---------------- */
    onBossWake: function (b) {
      DC.Audio.play('roar');
      G.shake(1.4);
      G.banner = { title: b.name + ' WAKES', sub: 'It remembers being hit.', life: 3.0, maxLife: 3.0, color: '#ff5c5c' };
      G.log(b.line, '#ff8a5c');
    },

    onBossDeath: function (b) {
      const w = G.world;
      w.portal.active = true;
      w.portal.discovered = false;
      G.banner = { title: b.name + ' IS DOWN', sub: 'The portal opens in the middle of the room.', life: 4.0, maxLife: 4.0, color: '#8ef0c0' };
      G.log('The portal is open. And the merchant shrugs.', '#8ef0c0');
      for (let i = 0; i < 3; i++) {
        const res = DC.Loot.grant(G, w, 'chest', b.x, b.y);
        G.log(res.text, res.color);
      }
      const bonus = Math.round(60 + 22 * w.depth);
      G.addGold(bonus);
      G.log('+' + bonus + ' coin from the Sovereign\u2019s hoard', '#ffd166');
    },

    onPlayerDeath: function (cause) {
      if (G.state === 'dead') return;
      G.deathCause = cause;
      G.player.dead = true;
      DC.Audio.play('death');
      DC.Audio.setScene('dead');
      G.saveBest();
      G.beginTransition(function () { G.setState('dead'); });
    },

    portalBearing: function () {
      const pt = G.world && G.world.portal;
      if (!pt) return 'somewhere below';
      const dx = pt.x - G.player.x, dy = pt.y - G.player.y;
      const a = Math.atan2(dy, dx);
      const dirs = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
      const i = Math.round(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
      return dirs[i] + ' of you';
    },

    shake: function (a) { DC.Camera.addShake(a); },

    /* ---------------- interaction ---------------- */
    onClick: function (mx, my) {
      DC.Audio.resume();
      if (G.state === 'title') { G.setState('classSelect'); G.hoverClass = 'mage'; return; }
      if (G.state === 'dead') { G.setState('classSelect'); return; }
      if (G.state === 'classSelect') {
        const cards = DC.UI.classCards(G);
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
            G.newRun(c.id);
            return;
          }
        }
        return;
      }
      if (G.state === 'lore') { G.loreCard = null; G.pendingLore = false; G.setState('playing'); return; }
      if (G.state === 'shop') {
        const hit = DC.Shop.hover(G, mx, my);
        if (hit >= 0) G.buy(hit);
        return;
      }
    },

    onMove: function (mx, my) {
      if (G.state === 'classSelect') {
        const cards = DC.UI.classCards(G);
        G.hoverClass = null;
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) G.hoverClass = c.id;
        }
        if (G.hoverClass) DC.Audio.play('uiMove');
      } else if (G.state === 'shop') {
        const hit = DC.Shop.hover(G, mx, my);
        if (hit >= 0 && hit !== G.shop.hover) DC.Audio.play('uiMove');
        G.shop.hover = hit;
      }
    },

    onKey: function (code, ev) {
      DC.Audio.resume();
      if (code === 'KeyM') { const m = DC.Audio.toggleMute(); G.log(m ? 'Audio muted' : 'Audio on', 'rgba(255,255,255,0.5)'); }
      if (G.state === 'title') {
        if (code === 'Enter' || code === 'Space' || code === 'NumpadEnter') { DC.Audio.play('uiSelect'); G.setState('classSelect'); G.hoverClass = 'mage'; }
        return;
      }
      if (G.state === 'classSelect') {
        if (code === 'ArrowLeft' || code === 'KeyA') { G.cycleClass(-1); }
        if (code === 'ArrowRight' || code === 'KeyD') { G.cycleClass(1); }
        if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
          DC.Audio.play('uiSelect');
          G.newRun(G.hoverClass || 'mage');
        }
        return;
      }
      if (G.state === 'lore') {
        if (code !== 'ShiftLeft' && code !== 'ShiftRight') { G.loreCard = null; G.pendingLore = false; G.setState('playing'); }
        return;
      }
      if (G.state === 'dead') {
        if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') { DC.Audio.play('uiSelect'); G.setState('classSelect'); }
        return;
      }
      if (G.state === 'pause') {
        if (code === 'Escape') G.setState('playing');
        if (code === 'KeyR') { G.deathCause = 'Your own patience'; G.saveBest(); G.player.dead = true; G.setState('dead'); DC.Audio.setScene('dead'); }
        return;
      }
      if (G.state === 'shop') {
        if (code === 'Escape' || code === 'KeyE') { G.setState('playing'); DC.Audio.play('uiSelect'); return; }
        const n = parseInt(code.replace('Digit', ''), 10);
        if (!isNaN(n) && n >= 1 && n <= G.shop.stock.length) G.buy(n - 1);
        return;
      }
      if (G.state === 'playing') {
        if (code === 'Escape') { G.setState('pause'); return; }
        if (code === 'KeyV') { DC.Camera.zoomCycle(); G.log('Zoom ' + DC.Camera.pxPerM + ' px/m', 'rgba(255,255,255,0.45)'); return; }
        if (code === 'Space') { DC.Player.ability(G.world, G.player, G); return; }
        if (code === 'KeyE') { G.tryInteract(); return; }
        if (code === 'Digit1') { DC.Player.drink(G.world, G.player, 'heal', G); return; }
        if (code === 'Digit2') { DC.Player.drink(G.world, G.player, 'mana', G); return; }
      }
    },

    cycleClass: function (dir) {
      const order = DC.CLASS_ORDER;
      let i = order.indexOf(G.hoverClass || 'mage');
      i = (i + dir + order.length) % order.length;
      G.hoverClass = order[i];
      DC.Audio.play('uiMove');
    },

    tryInteract: function () {
      const t = G.interactTarget;
      if (!t) return;
      if (t.kind === 'merchant') {
        G.shop = { stock: t.stock, line: t.line, hover: -1 };
        G.setState('shop');
        DC.Audio.play('uiSelect');
      } else if (t.kind === 'portal') {
        G.descend();
      }
    },

    buy: function (i) {
      const entry = G.shop.stock[i];
      if (!entry || entry.sold) { DC.Audio.play('empty'); return; }
      if (G.player.gold < entry.price) {
        DC.Audio.play('empty');
        G.log('Not enough coin for ' + entry.item.name, '#ff5c5c');
        return;
      }
      G.player.gold -= entry.price;
      entry.sold = true;
      DC.Audio.play('buy');
      let res;
      if (entry.item.type === 'potion') res = G.addItem(entry.item);
      else if (entry.item.type === 'upgrade') res = { text: G.applyUpgrade(entry.item), color: entry.item.color };
      else res = G.applyItem(entry.item);
      G.log(res.text, res.color);
    },

    /* ---------------- simulation ---------------- */
    step: function (dt) {
      const w = G.world, p = G.player;
      G.stats.time += dt;

      DC.Input.poll();
      // Aim comes from the cursor, in world terms, and is handed to the actor
      // through the input frame so attacks and the drawn aim always agree.
      if (DC.Input.hasMouse) {
        const sx = DC.Camera.worldToScreenX(p.x), sy = DC.Camera.worldToScreenY(p.y);
        DC.Input.aim = Math.atan2(DC.Input.my - sy, DC.Input.mx - sx);
      } else if (DC.Input.moveX || DC.Input.moveY) {
        DC.Input.aim = Math.atan2(DC.Input.moveY, DC.Input.moveX);
      }
      p.aim = DC.Input.aim;

      DC.Player.update(w, p, DC.Input, dt, G);
      // The camera follows the actor every step, not every frame, so it stays
      // in lockstep with the simulation whatever the display refresh does.
      DC.Camera.follow(p, dt);
      // What the torch reveals is simulation state (the minimap, the demon
      // sight gate and the shop all read it), so it advances with the step.
      DC.Fog.discover(w, p);
      DC.Flow.refresh(w, dt);
      for (let i = 0; i < w.demons.length; i++) DC.Demons.update(w, w.demons[i], dt, G);
      if (w.boss) DC.Boss.update(w, w.boss, dt, G);
      DC.Combat.updateProjectiles(w, dt, G);
      DC.updateParticles(w, dt);

      // chests open on touch
      for (let i = 0; i < w.chests.length; i++) {
        const c = w.chests[i];
        c.anim += dt;
        if (!c.opened && Math.hypot(c.x - p.x, c.y - p.y) < c.r + p.r + 0.35) {
          DC.Loot.onChest(G, w, c);
          G.stats.chests++;
        }
      }
      if (w.merchant) w.merchant.bob += dt;
      if (w.portal) w.portal.anim += dt;

      // interact prompt + auto-descend
      G.interactTarget = null;
      if (w.merchant && Math.hypot(w.merchant.x - p.x, w.merchant.y - p.y) < 3.2) G.interactTarget = w.merchant;
      const pt = w.portal;
      if (pt && pt.active) {
        const d = Math.hypot(pt.x - p.x, pt.y - p.y);
        if (d < 4.2 && !G.interactTarget) G.interactTarget = { kind: 'portal', x: pt.x, y: pt.y };
        if (d < 1.4 && !G.transition) G.descend();
      }

      // heartbeat warning
      if (p.hp / p.maxHp < 0.3 && !p.dead) {
        G.heartT -= dt;
        if (G.heartT <= 0) { G.heartT = 1.15; DC.Audio.play('heartbeat'); }
      }

      // music intensity from the local heat
      let heat = 0;
      for (let i = 0; i < w.demons.length; i++) {
        const d = w.demons[i];
        if (d.dead || !d.hasSeen) continue;
        if (Math.hypot(d.x - p.x, d.y - p.y) < 26) heat++;
      }
      if (w.boss && !w.boss.dead && w.boss.awake) heat += 4;
      DC.Audio.setIntensity(heat / 6);

      // logs age
      for (let i = G.logs.length - 1; i >= 0; i--) {
        G.logs[i].life -= dt;
        if (G.logs[i].life <= 0) G.logs.splice(i, 1);
      }
      if (G.banner) { G.banner.life -= dt; if (G.banner.life <= 0) G.banner = null; }
    },

    /* ---------------- frame ---------------- */
    loop: function (ts) {
      const now = ts / 1000;
      if (G.last == null) G.last = now;
      let dt = now - G.last;
      G.last = now;
      if (dt > 0.25) dt = 0.25;
      G.time += dt;

      if (G.state === 'playing' && !G.transition) {
        G.acc += dt;
        let steps = 0;
        while (G.acc >= C.DT && steps < C.MAX_STEPS) {
          G.step(C.DT);
          G.acc -= C.DT;
          steps++;
        }
        if (steps === C.MAX_STEPS) G.acc = 0;
      }

      if (G.transition) {
        G.transition.t += dt;
        if (G.transition.t >= G.transition.dur * 0.5 && !G.transition.done) {
          G.transition.done = true;
          if (G.transition.fn) G.transition.fn();
        }
        if (G.transition.t >= G.transition.dur) G.transition = null;
      }

      DC.Audio.update(dt);
      DC.Camera.update(dt);
      G.render();
      DC.Input.endFrame();
      requestAnimationFrame(G.loop);
    },

    render: function () {
      const ctx = G.ctx, cam = DC.Camera;
      ctx.save();
      if (G.world && G.player) {
        DC.Fog.update(G.world, G.player, cam, 0.016);
        DC.Render.world(ctx, G.world, cam);
        DC.Render.props(ctx, G.world, cam, DC.Fog);
        if (G.world.boss) {
          const b = G.world.boss;
          if (b.dead && b.deadT > 1.6) { /* corpse fades */ }
          else if (DC.Fog.visible(G.world, G.player, b.x, b.y, b.r) || b.awake) DC.Render.boss(ctx, b, cam);
        }
        for (let i = 0; i < G.world.demons.length; i++) {
          const d = G.world.demons[i];
          if (d.dead && d.deadT > 1.6) continue;
          if (!DC.Fog.visible(G.world, G.player, d.x, d.y, d.r)) continue;
          DC.Render.demon(ctx, d, cam);
        }
        if (!G.player.dead || G.player.deadT < 0.6) DC.Render.player(ctx, G.player, cam, DC.Input);
        DC.Render.projectiles(ctx, G.world, cam, DC.Fog);
        DC.Render.particles(ctx, G.world, cam);
        DC.Render.light(ctx, cam);
        DC.Render.torch(ctx, cam, G.player);
        DC.Render.floaters(ctx, G.world, cam);
        if (G.state !== 'title') DC.Render.hud(ctx, G, cam);
        DC.Render.minimap(ctx, G, cam);
      } else {
        ctx.fillStyle = '#05070b';
        ctx.fillRect(0, 0, cam.w, cam.h);
      }

      if (G.state === 'title') DC.UI.drawTitle(ctx, G);
      else if (G.state === 'classSelect') DC.UI.drawClassSelect(ctx, G);
      else if (G.state === 'lore') DC.UI.drawLore(ctx, G);
      else if (G.state === 'pause') DC.UI.drawPause(ctx, G);
      else if (G.state === 'shop') DC.Shop.draw(ctx, G);
      else if (G.state === 'dead') DC.UI.drawDeath(ctx, G);

      if (G.transition) {
        const k = G.transition.t / G.transition.dur;
        const a = k < 0.5 ? k * 2 : (1 - k) * 2;
        ctx.fillStyle = 'rgba(2,3,5,' + M.clamp(a, 0, 1) + ')';
        ctx.fillRect(0, 0, cam.w, cam.h);
      }
      ctx.restore();
    },
  };

  DC.Game = G;
  if (typeof document !== 'undefined' && document.getElementById('game')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', G.init);
    else G.init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
