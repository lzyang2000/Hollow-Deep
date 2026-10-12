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
    invSel: 0, invHover: null, pauseHover: null, titleHover: null, classHover: null,

    /* ---------------- boot ---------------- */
    init: function () {
      G.canvas = document.getElementById('game');
      G.ctx = G.canvas.getContext('2d');
      DC.Fog.init(document);
      DC.Layout.detect();
      G.resize();
      global.addEventListener('resize', function () { G.resize(); });
      // iOS reports the new size before the keyboard/rotation has settled, so
      // a phone turning sideways needs a second look.
      global.addEventListener('orientationchange', function () {
        global.setTimeout(function () { G.resize(); }, 150);
      });

      DC.Input.init(G.canvas);
      DC.Touch.init(G.canvas, G);
      G.wireFiles();
      G.setHint();
      G.canvas.addEventListener('click', function (e) {
        const r = G.canvas.getBoundingClientRect();
        G.onClick(e.clientX - r.left, e.clientY - r.top);
      });
      G.canvas.addEventListener('mousemove', function (e) {
        const r = G.canvas.getBoundingClientRect();
        G.onMove(e.clientX - r.left, e.clientY - r.top);
      });
      // Right button is the pack's "get rid of this" gesture. The browser menu
      // is already suppressed in input.js.
      G.canvas.addEventListener('contextmenu', function (e) {
        const r = G.canvas.getBoundingClientRect();
        G.onRightClick(e.clientX - r.left, e.clientY - r.top);
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
      G.setHint();
    },

    /* The one-line control reminder at the bottom of the page. A phone has no
       WASD, so it gets the gestures it actually has. */
    setHint: function () {
      const el = global.document && global.document.getElementById('hint');
      if (!el) return;
      if (DC.Layout.touch) {
        el.textContent = 'Two thumbs: drag with one to walk and aim, hold ATTACK with the other \u00b7 one thumb: tap to strike, or tap ATTACK \u00b7 tap the merchant or the portal \u00b7 tap the map for the whole floor';
      } else {
        el.textContent = 'WASD move \u00b7 mouse aim \u00b7 click attack \u00b7 SPACE ability \u00b7 E interact \u00b7 1/2 potions \u00b7 I pack \u00b7 N map \u00b7 V zoom \u00b7 M mute \u00b7 ESC pause \u00b7 S/L save and load in the pause menu';
      }
    },

    /* ---------------- save / load ----------------
       A run is carried out as a JSON file and taken back in as one. The level
       itself is never stored -- it is rebuilt from the seed -- so the file is
       small, readable, and cannot smuggle in a floor that does not exist. */
    wireFiles: function () {
      const doc = global.document;
      if (!doc) return;
      const input = doc.getElementById('load-file');
      if (input) {
        input.addEventListener('change', function () {
          const f = input.files && input.files[0];
          if (!f) return;
          G.readFile(f);
          input.value = '';
        });
      }
      // Dragging a save onto the window is the desktop shortcut for the same thing.
      global.addEventListener('dragover', function (e) { if (e.preventDefault) e.preventDefault(); });
      global.addEventListener('drop', function (e) {
        if (e.preventDefault) e.preventDefault();
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) G.readFile(f);
      });
    },

    readFile: function (file) {
      if (!global.FileReader) { G.log('This browser cannot open a file.', '#ff5c5c'); return; }
      const fr = new global.FileReader();
      fr.onload = function () { G.loadFromText(String(fr.result || '')); };
      fr.onerror = function () { G.log('The file would not open.', '#ff5c5c'); };
      fr.readAsText(file);
    },

    saveToDisk: function () {
      if (!G.player || G.player.dead) { G.log('A dead run cannot be carried out.', '#ff8a5c'); return { ok: false }; }
      const res = DC.Save.download(G);
      if (res.ok) {
        DC.Audio.play('buy');
        G.log((res.shared ? 'Shared ' : 'Saved ') + res.name + (res.bytes ? ' \u00b7 ' + res.bytes + ' B' : ''), '#8ef0c0');
      } else {
        DC.Audio.play('empty');
        G.log('Could not write the save: ' + res.error, '#ff5c5c');
      }
      return res;
    },

    openLoadPicker: function () {
      const el = global.document && global.document.getElementById('load-file');
      if (!el) { G.log('No file picker in this browser.', '#ff5c5c'); return false; }
      el.click();
      return true;
    },

    loadFromText: function (text) {
      const parsed = DC.Save.parse(text);
      if (!parsed.ok) { DC.Audio.play('empty'); G.log(parsed.error, '#ff5c5c'); return parsed; }
      const out = DC.Save.restore(G, parsed.save);
      if (!out.ok) { DC.Audio.play('empty'); G.log(out.error, '#ff5c5c'); return out; }
      DC.Audio.play('uiSelect');
      G.setState('playing');
      return out;
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

    /* The map is a state, not an overlay painted over a live fight: the loop
       only steps while state is 'playing', so opening the map stops the floor
       and everything on it. */
    toggleMap: function () {
      if (G.state === 'playing') { G.setState('map'); DC.Audio.play('uiSelect'); }
      else if (G.state === 'map') { G.setState('playing'); DC.Audio.play('uiSelect'); }
    },

    onMinimap: function (mx, my) {
      const r = DC.Render && DC.Render.minimapRect;
      return !!r && mx >= r.x && mx <= r.x + r.size && my >= r.y && my <= r.y + r.size;
    },

    setState: function (s) {
      G.state = s;
      DC.Input.firing = false;
      DC.Input.dragging = false;
      DC.Input.tapFrames = 0;
      if (DC.Touch) DC.Touch.release();
      G.pauseHover = null;
      G.titleHover = null;
      G.classHover = null;
      if (s === 'playing') DC.Input.keys = Object.create(null);
    },

    /* ---------------- run ---------------- */
    newRun: function (classId, startDepth) {
      G.seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
      G.rng = new DC.RNG(G.seed);
      G.depth = Math.max(1, startDepth | 0) || 1;
      G.player = DC.Player.create(classId);
      G.stats = { kills: 0, goldEarned: 0, time: 0, meleeHits: 0, chests: 0, urns: 0, potions: 0 };
      G.logs = [];
      G.invSel = 0;
      G.invHover = null;
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

    /* A find goes straight onto your back when it is a real gain -- stats
       bought with stride included, at the rate this career values stride -- and
       otherwise waits in the pack for you to decide. The first thing you ever
       find for an empty slot always goes on: nobody should start a run unarmed
       because they did not know to press a key. */
    applyItem: function (item) {
      const p = G.player;
      const slot = DC.Inv.slotOf(item);
      if (!slot) return { text: 'Found ' + item.name, color: item.color };
      const worn = p[slot];
      const gain = DC.Inv.fit(p, item);
      if (!worn || gain >= DC.C.AUTO_EQUIP_MARGIN) {
        p[slot] = item;
        // The displaced piece goes through the pack's own door, so a full bag
        // still melts the least useful thing rather than quietly overflowing.
        let tail = '';
        if (worn) {
          const off = DC.Inv.add(p, worn, G);
          if (off.text) tail = '  ' + off.text;
        }
        DC.Inv.applyStats(p);
        DC.Audio.play('levelUp');
        return {
          text: 'Equipped ' + item.name + ' (' + DC.Inv.statLine(item) + ')' + tail,
          color: item.color, auto: !!worn,
        };
      }
      const res = DC.Inv.add(p, item, G);
      if (res.packed) {
        DC.Audio.play('uiMove');
        return { text: res.text + '  ' + DC.Inv.compare(p, item) + ' vs worn  [I]', color: res.color };
      }
      return res;
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
      if (G.state === 'playing') {
        // A click on the map panel is a request to see the floor, not a swing.
        if (G.onMinimap(mx, my)) G.toggleMap();
        return;
      }
      if (G.state === 'map') { G.toggleMap(); return; }
      if (G.state === 'title') {
        const tb = DC.UI.titleButtons(G);
        for (let i = 0; i < tb.length; i++) {
          if (DC.UI.hit(tb[i], mx, my)) {
            if (tb[i].id === 'load') { DC.Audio.play('uiSelect'); G.openLoadPicker(); return; }
            break;
          }
        }
        DC.Audio.play('uiSelect');
        G.setState('classSelect'); G.hoverClass = 'mage'; return;
      }
      if (G.state === 'pause') {
        const rows = DC.UI.pauseMenu(G);
        for (let i = 0; i < rows.length; i++) {
          if (DC.UI.hit(rows[i], mx, my)) { G.pauseAction(rows[i].id); return; }
        }
        return;
      }
      if (G.state === 'dead') { G.setState('classSelect'); return; }
      if (G.state === 'classSelect') {
        const nav = DC.UI.classNav(G);
        if (nav) {
          if (DC.UI.hit(nav.prev, mx, my)) { G.cycleClass(-1); return; }
          if (DC.UI.hit(nav.next, mx, my)) { G.cycleClass(1); return; }
          if (DC.UI.hit(nav.choose, mx, my)) {
            DC.Audio.play('uiSelect');
            G.newRun(G.hoverClass || 'mage');
            return;
          }
        }
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
        const L = DC.Shop.layout(G);
        if (L.back && DC.UI.hit(L.back, mx, my)) { G.setState('playing'); DC.Audio.play('uiSelect'); return; }
        const hit = DC.Shop.hover(G, mx, my);
        if (hit >= 0) G.buy(hit);
        return;
      }
      if (G.state === 'inventory') {
        const hit = DC.UI.Inv.hover(G, mx, my);
        if (!hit) return;
        if (hit.kind === 'close') { G.closePack(); return; }
        if (hit.kind === 'sell') { G.sellFromPack(G.invSel); return; }
        if (hit.kind === 'bag') {
          // On a fingertip a row is picked up first and worn second, because a
          // mis-tap that re-dresses you is a mistake you cannot see coming.
          if (DC.Layout.touch && G.player.inv[hit.i] && G.invSel !== hit.i) G.invSel = hit.i;
          else G.equipFromPack(hit.i);
        } else if (hit.kind === 'equip') G.stowSlot(hit.slot);
        else if (hit.kind === 'potion') DC.Player.drink(G.world, G.player, hit.key, G);
        return;
      }
    },

    onMove: function (mx, my) {
      if (G.state === 'title') {
        const tb = DC.UI.titleButtons(G);
        let hit = null;
        for (let i = 0; i < tb.length; i++) if (DC.UI.hit(tb[i], mx, my)) hit = tb[i].id;
        if (hit !== G.titleHover) { if (hit) DC.Audio.play('uiMove'); G.titleHover = hit; }
      } else if (G.state === 'pause') {
        const rows = DC.UI.pauseMenu(G);
        let hit = null;
        for (let i = 0; i < rows.length; i++) if (DC.UI.hit(rows[i], mx, my)) hit = rows[i].id;
        if (hit !== G.pauseHover) { if (hit) DC.Audio.play('uiMove'); G.pauseHover = hit; }
      } else if (G.state === 'classSelect') {
        const nav = DC.UI.classNav(G);
        G.classHover = nav && DC.UI.hit(nav.choose, mx, my) ? 'choose' : null;
        const cards = DC.UI.classCards(G);
        let over = null;
        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) over = c.id;
        }
        if (nav) {
          if (DC.UI.hit(nav.prev, mx, my)) over = G.hoverClass;
          if (DC.UI.hit(nav.next, mx, my)) over = G.hoverClass;
        }
        if (over && over !== G.hoverClass) DC.Audio.play('uiMove');
        if (over) G.hoverClass = over;
      } else if (G.state === 'shop') {
        const hit = DC.Shop.hover(G, mx, my);
        if (hit >= 0 && hit !== G.shop.hover) DC.Audio.play('uiMove');
        G.shop.hover = hit;
      } else if (G.state === 'inventory') {
        const hit = DC.UI.Inv.hover(G, mx, my);
        if (hit && hit.kind === 'bag' && (!G.invHover || G.invHover.kind !== 'bag' || G.invHover.i !== hit.i)) DC.Audio.play('uiMove');
        G.invHover = hit;
      }
    },

    onKey: function (code, ev) {
      DC.Audio.resume();
      if (code === 'KeyM') { const m = DC.Audio.toggleMute(); G.log(m ? 'Audio muted' : 'Audio on', 'rgba(255,255,255,0.5)'); }
      if (G.state === 'title') {
        if (code === 'Enter' || code === 'Space' || code === 'NumpadEnter') { DC.Audio.play('uiSelect'); G.setState('classSelect'); G.hoverClass = 'mage'; }
        if (code === 'KeyL') { DC.Audio.play('uiSelect'); G.openLoadPicker(); }
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
        if (code === 'Escape' || code === 'Enter' || code === 'NumpadEnter') { G.setState('playing'); return; }
        if (code === 'KeyS') { G.saveToDisk(); return; }
        if (code === 'KeyL') { G.openLoadPicker(); return; }
        if (code === 'KeyI') { G.openPack(); return; }
        if (code === 'KeyR') { G.abandonRun(); return; }
        return;
      }
      if (G.state === 'shop') {
        if (code === 'Escape' || code === 'KeyE') { G.setState('playing'); DC.Audio.play('uiSelect'); return; }
        const n = parseInt(code.replace('Digit', ''), 10);
        if (!isNaN(n) && n >= 1 && n <= Math.min(9, G.shop.stock.length)) G.buy(n - 1);
        return;
      }
      if (G.state === 'inventory') {
        if (code === 'Escape' || code === 'KeyI' || code === 'Tab') { G.closePack(); return; }
        const n = parseInt(code.replace('Digit', ''), 10);
        if (!isNaN(n)) {
          const idx = code === 'Digit0' ? 9 : n - 1;
          if (idx >= 0 && idx < G.player.inv.length) { G.invSel = idx; DC.Audio.play('uiMove'); return; }
        }
        if (code === 'ArrowUp' || code === 'KeyW') { G.moveSel(-1); return; }
        if (code === 'ArrowDown' || code === 'KeyS') { G.moveSel(1); return; }
        if (code === 'KeyE' || code === 'Enter' || code === 'NumpadEnter' || code === 'Space') { G.equipFromPack(G.invSel); return; }
        if (code === 'KeyX' || code === 'Backspace') { G.sellFromPack(G.invSel); return; }
        if (code === 'KeyR') { G.sortPack(); return; }
        if (code === 'KeyQ') { DC.Player.drink(G.world, G.player, 'heal', G); return; }
        if (code === 'KeyF') { DC.Player.drink(G.world, G.player, 'mana', G); return; }
        return;
      }
      if (G.state === 'map') {
        if (code === 'Escape' || code === 'Enter' || code === 'Space' || code === 'KeyN' || code === 'Tab') {
          if (code === 'Tab') ev.preventDefault();
          G.toggleMap();
        }
        return;
      }
      if (G.state === 'playing') {
        if (code === 'Escape') { G.setState('pause'); return; }
        if (code === 'KeyN') { G.toggleMap(); return; }
        if (code === 'KeyI' || code === 'Tab') { G.openPack(); return; }
        if (code === 'KeyV') { DC.Camera.zoomCycle(); G.log('Zoom ' + DC.Camera.pxPerM + ' px/m', 'rgba(255,255,255,0.45)'); return; }
        if (code === 'Space') { DC.Player.ability(G.world, G.player, G); return; }
        if (code === 'KeyE') { G.tryInteract(); return; }
        if (code === 'Digit1') { DC.Player.drink(G.world, G.player, 'heal', G); return; }
        if (code === 'Digit2') { DC.Player.drink(G.world, G.player, 'mana', G); return; }
      }
    },

    pauseAction: function (id) {
      if (id === 'resume') { G.setState('playing'); DC.Audio.play('uiSelect'); }
      else if (id === 'pack') G.openPack();
      else if (id === 'save') G.saveToDisk();
      else if (id === 'load') G.openLoadPicker();
      else if (id === 'mute') { const m = DC.Audio.toggleMute(); G.log(m ? 'Audio muted' : 'Audio on', 'rgba(255,255,255,0.5)'); }
      else if (id === 'abandon') G.abandonRun();
    },

    abandonRun: function () {
      if (!G.player || G.player.dead) return;
      G.deathCause = 'Your own patience';
      G.saveBest();
      G.player.dead = true;
      G.setState('dead');
      DC.Audio.setScene('dead');
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

    /* ---------------- the pack ---------------- */
    openPack: function () {
      G.invSel = Math.min(G.invSel, Math.max(0, G.player.inv.length - 1));
      G.invHover = null;
      G.setState('inventory');
      DC.Audio.play('uiSelect');
    },
    closePack: function () { G.setState('playing'); DC.Audio.play('uiSelect'); },

    moveSel: function (dir) {
      const n = G.player.inv.length;
      if (!n) { G.invSel = 0; return; }
      G.invSel = ((G.invSel + dir) % n + n) % n;
      DC.Audio.play('uiMove');
    },

    equipFromPack: function (i) {
      const res = DC.Inv.equip(G.player, i, G);
      if (!res) { DC.Audio.play('empty'); return; }
      G.invSel = Math.min(i, Math.max(0, G.player.inv.length - 1));
      G.log(res.text, res.color);
      return res;
    },

    stowSlot: function (slot) {
      const res = DC.Inv.stow(G.player, slot, G);
      if (!res) { DC.Audio.play('empty'); return; }
      if (!res.full) G.invSel = Math.min(G.invSel, Math.max(0, G.player.inv.length - 1));
      G.log(res.text, res.color);
      return res;
    },

    sellFromPack: function (i) {
      const res = DC.Inv.sell(G.player, i, G, 1);
      if (!res) { DC.Audio.play('empty'); return; }
      G.invSel = Math.min(i, Math.max(0, G.player.inv.length - 1));
      G.log(res.text, res.color);
      return res;
    },

    sortPack: function () {
      if (G.player.inv.length < 2) { DC.Audio.play('empty'); return; }
      DC.Inv.sort(G.player);
      G.invSel = 0;
      DC.Audio.play('uiSelect');
      G.log('You straighten the pack on the bench.', 'rgba(199,155,255,0.7)');
    },

    onRightClick: function (mx, my) {
      DC.Audio.resume();
      if (G.state !== 'inventory') return;
      const hit = DC.UI.Inv.hover(G, mx, my);
      if (hit && hit.kind === 'bag' && G.player.inv[hit.i]) G.sellFromPack(hit.i);
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

    /* The closest demon the torch is actually showing, within reach of the
       weapon in hand. Only the one-handed ATTACK button asks for it: it has no
       fingertip on the field to aim with, and a swing that misses everything
       is not a fight. */
    aimAssist: function (p) {
      const w = G.world;
      if (!w) return null;
      const c = p.cls;
      const range = c.attackKind === 'melee' ? c.reach + 1.2
        : Math.min(c.projSpeed * c.projLife, 24);
      let best = null, bd = range;
      const consider = function (d) {
        if (!d || d.dead) return;
        const dist = Math.hypot(d.x - p.x, d.y - p.y);
        if (dist >= bd) return;
        if (!DC.Fog.visible(w, p, d.x, d.y, 0)) return;
        best = d; bd = dist;
      };
      for (let i = 0; i < w.demons.length; i++) consider(w.demons[i]);
      consider(w.boss);
      return best;
    },

    /* ---------------- simulation ---------------- */
    step: function (dt) {
      const w = G.world, p = G.player;
      G.stats.time += dt;

      DC.Input.poll();
      // Aim comes from the cursor, in world terms, and is handed to the actor
      // through the input frame so attacks and the drawn aim always agree.
      if (DC.Input.aimHold) {
        // touch already put the aim where the finger is
      } else if (DC.Input.hasMouse) {
        const sx = DC.Camera.worldToScreenX(p.x), sy = DC.Camera.worldToScreenY(p.y);
        DC.Input.aim = Math.atan2(DC.Input.my - sy, DC.Input.mx - sx);
      } else if (DC.Input.moveX || DC.Input.moveY) {
        DC.Input.aim = Math.atan2(DC.Input.moveY, DC.Input.moveX);
      }
      // Assist aims for whoever is not aiming on purpose. A pushed aim stick is
      // a deliberate direction, so it is left alone; so is a field fingertip
      // serving as the reticle one-handed. Everything else -- a thumb parked on
      // the pad, a thumb on the ATTACK circle -- gets the nearest demon in the
      // light, because a swing that hits nothing is not a fight. A mouse wins.
      const stickAims = DC.Touch && DC.Touch.stick.active && DC.Touch.stick.dragged;
      const fieldAims = DC.Touch && DC.Touch.active && !DC.Touch.stick.active;
      if (DC.Input.firing && DC.Touch && DC.Touch.attack && !stickAims && !fieldAims && !DC.Input.hasMouse) {
        const t = G.aimAssist(p);
        if (t) DC.Input.aim = Math.atan2(t.y - p.y, t.x - p.x);
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
      // Urns shatter on contact. With a floor this crowded the pottery
      // along the walkway is the potion supply, and stopping to chip at
      // every one of sixty of them is not a game.
      for (let i = 0; i < w.urns.length; i++) {
        const u = w.urns[i];
        u.anim += dt;
        if (!u.broken && Math.hypot(u.x - p.x, u.y - p.y) < u.r + p.r + 0.15) {
          u.broken = true;   // the caller marks it, as the combat smashes do
          DC.Loot.onUrn(G, w, u);
          G.stats.urns++;
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

      // music intensity from the local heat, and the calm clock that gates
      // out-of-combat recovery: any hunter on this floor, or a hit in the
      // last moments, resets it.
      let heat = 0, seenByAny = false;
      for (let i = 0; i < w.demons.length; i++) {
        const d = w.demons[i];
        if (d.dead || !d.hasSeen) continue;
        seenByAny = true;
        if (Math.hypot(d.x - p.x, d.y - p.y) < 26) heat++;
      }
      if (w.boss && !w.boss.dead && w.boss.awake) { seenByAny = true; heat += 4; }
      if (seenByAny || p.hurtT > 0 || p.dead) p.calmT = 0; else p.calmT += dt;
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
        // The whole-floor map is a snapshot: while it is open the torch stops
        // taking back ground, so reading the map is never itself a scout.
        if (G.state !== 'map') DC.Fog.update(G.world, G.player, cam, 0.016);
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
      else if (G.state === 'inventory') DC.UI.Inv.draw(ctx, G);
      else if (G.state === 'map') DC.Render.fullMap(ctx, G, cam);
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
