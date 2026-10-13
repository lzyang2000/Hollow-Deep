/* Saving a run to a file you keep, and loading it back.
   The level is not stored -- it is rebuilt from the seed -- so a save holds
   only the run and what changed on the current floor. Everything read from a
   file is treated as untrusted: numbers are clamped, indices bounds-checked,
   and a file that does not look like a save is refused before it can corrupt
   anything. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const C = DC.C;

  const FORMAT = 'hollowdeep-save';
  // 2: the level is 40x40 tiles now, so an old save's seed builds a different
  // floor and its stored demon coordinates no longer mean anything.
  // 3: the gate is chosen from room-interior tiles, which draws the rng a
  // different number of times -- the same seed now builds a different floor
  // behind the player, so a version-2 file cannot be dropped back in.
  // 4: a boss arena now sits on every 5th floor instead of every 10th, and
  // floors have names. A version-3 file would drop a delver who stopped on
  // depth 15 into an arena they never fought their way into.
  // 5: the floor is 30x30 tiles now, not 40x40, and the throne room is a 50 m
  // chamber instead of the whole level. A version-4 file would put a delver
  // outside its own map and hand the Sovereign back a stadium it never fought
  // in.
  const VERSION = 5;

  function num(v, min, max, dflt) {
    const n = typeof v === 'number' ? v : Number(v);
    if (!isFinite(n)) return dflt;
    return n < min ? min : (n > max ? max : n);
  }
  function int(v, min, max, dflt) { return Math.round(num(v, min, max, dflt)); }
  function r2(v) { return Math.round(v * 100) / 100; }

  /* A 3600-flag fog map as raw numbers reads as noise in a text file. Runs of
     consecutive indices stay short and stay human-editable. */
  function toRuns(bytes) {
    const out = [];
    let i = 0;
    while (i < bytes.length) {
      if (!bytes[i]) { i++; continue; }
      let j = i;
      while (j + 1 < bytes.length && bytes[j + 1]) j++;
      out.push(i === j ? i : [i, j]);
      i = j + 1;
    }
    return out;
  }
  function fromRuns(runs, len) {
    const arr = new Uint8Array(len);
    if (!Array.isArray(runs)) return arr;
    for (let k = 0; k < runs.length; k++) {
      const r = runs[k];
      const a = Array.isArray(r) ? int(r[0], 0, len - 1, -1) : int(r, 0, len - 1, -1);
      if (a < 0) continue;
      const b = Array.isArray(r) ? int(r[1], a, len - 1, a) : a;
      for (let i = a; i <= b && i < len; i++) arr[i] = 1;
    }
    return arr;
  }
  /* An index out of range is a corrupt entry, not a near miss: clamping it
     would silently mark some other chest, urn or demon. Drop it instead. */
  function idx(v, len) {
    const n = typeof v === 'number' ? v : Number(v);
    if (!isFinite(n)) return -1;
    const r = Math.round(n);
    if (r < 0 || r >= len) return -1;
    return r;
  }
  function indexList(list, len) {
    const out = [];
    if (!Array.isArray(list)) return out;
    for (let i = 0; i < list.length; i++) {
      const v = idx(list[i], len);
      if (v >= 0 && out.indexOf(v) < 0) out.push(v);
    }
    return out;
  }

  /* Resolve a career name from a file to one this build actually has. */
  function classId(v) {
    if (DC.CLASSES[v]) return v;
    const alias = DC.CLASS_ALIAS && DC.CLASS_ALIAS[v];
    return alias && DC.CLASSES[alias] ? alias : null;
  }

  DC.Save = {
    FORMAT: FORMAT,
    VERSION: VERSION,

    /* Exported so the UI and the tests can ask the same question. */
    classId: classId,

    fileName: function (game) {
      return 'hollowdeep-' + (game.player ? game.player.classId : 'run') +
        '-depth' + game.depth + '.json';
    },

    /* ---------------- write ---------------- */
    serialize: function (game) {
      const p = game.player, w = game.world;
      const demons = [];
      for (let i = 0; i < w.demons.length; i++) {
        const d = w.demons[i];
        demons.push([i, r2(d.x), r2(d.y), d.dead ? -1 : Math.max(0, Math.round(d.hp))]);
      }
      const opened = [], broken = [];
      for (let i = 0; i < w.chests.length; i++) if (w.chests[i].opened) opened.push(i);
      for (let i = 0; i < w.urns.length; i++) if (w.urns[i].broken) broken.push(i);
      const sold = [];
      if (w.merchant && w.merchant.stock) {
        for (let i = 0; i < w.merchant.stock.length; i++) if (w.merchant.stock[i].sold) sold.push(i);
      }
      return {
        format: FORMAT, version: VERSION,
        savedAt: new Date().toISOString(),
        seed: game.seed >>> 0,
        depth: game.depth,
        rngState: game.rng ? game.rng.s >>> 0 : 0,
        player: {
          classId: p.classId,
          x: r2(p.x), y: r2(p.y), aim: r2(p.aim),
          hp: r2(p.hp), mp: r2(p.mp), gold: Math.max(0, Math.round(p.gold)),
          bonusAtk: p.bonusAtk, bonusDef: p.bonusDef,
          bonusHp: p.bonusHp, bonusMp: p.bonusMp,
          bonusMove: p.bonusMove, bonusAtkSpeed: p.bonusAtkSpeed,
          weapon: p.weapon || null, armor: p.armor || null,
          inv: p.inv.slice(0, C.INV_SIZE),
          potions: { heal: p.potions.heal | 0, mana: p.potions.mana | 0, greaterHeal: p.potions.greaterHeal | 0 },
        },
        stats: {
          kills: game.stats.kills, goldEarned: game.stats.goldEarned,
          time: r2(game.stats.time), meleeHits: game.stats.meleeHits,
          chests: game.stats.chests, urns: game.stats.urns, potions: game.stats.potions,
        },
        level: {
          demons: demons,
          chestsOpened: opened, urnsBroken: broken, merchantSold: sold,
          boss: w.boss ? { hp: r2(w.boss.hp), awake: !!w.boss.awake, dead: !!w.boss.dead } : null,
          portal: w.portal ? {
            active: !!w.portal.active, discovered: !!w.portal.discovered,
            tx: w.portal.tx, ty: w.portal.ty,
          } : null,
          seen: toRuns(w.discovered),
        },
      };
    },

    /* ---------------- read ---------------- */
    describe: function (obj) {
      if (!DC.Save.valid(obj)) return null;
      return {
        depth: obj.depth, classId: obj.player.classId,
        gold: obj.player.gold, savedAt: obj.savedAt,
      };
    },

    valid: function (obj) {
      if (!obj || typeof obj !== 'object') return false;
      if (obj.format !== FORMAT) return false;
      if (obj.version !== VERSION) return false;
      if (!obj.player || !classId(obj.player.classId)) return false;
      if (typeof obj.seed !== 'number' || !isFinite(obj.seed)) return false;
      if (typeof obj.depth !== 'number' || !isFinite(obj.depth) || obj.depth < 1) return false;
      return true;
    },

    /* Rebuilds the run, then the floor, then replays what changed on it.
       Returns { ok, error } and never leaves the game half-restored: the
       level is only touched once every value has been clamped. */
    restore: function (game, obj) {
      if (!DC.Save.valid(obj)) return { ok: false, error: 'That file is not a Hollow Deep save.' };

      const wantCls = classId(obj.player.classId);
      const depth = int(obj.depth, 1, 100000, 1);

      game.best = game.loadBest();
      game.seed = obj.seed >>> 0;
      game.rng = new DC.RNG(game.seed);
      if (typeof obj.rngState === 'number' && isFinite(obj.rngState)) game.rng.s = obj.rngState >>> 0;

      const p = DC.Player.create(wantCls);
      p.bonusAtk = num(obj.player.bonusAtk, 0, 100000, 0);
      p.bonusDef = num(obj.player.bonusDef, 0, 100000, 0);
      p.bonusHp = num(obj.player.bonusHp, 0, 100000, 0);
      p.bonusMp = num(obj.player.bonusMp, 0, 100000, 0);
      p.bonusMove = num(obj.player.bonusMove, 0, 50, 0);
      p.bonusAtkSpeed = num(obj.player.bonusAtkSpeed, 0, 20, 0);
      p.weapon = DC.Save.readItem(obj.player.weapon, 'weapon');
      p.armor = DC.Save.readItem(obj.player.armor, 'armor');
      p.inv = [];
      if (Array.isArray(obj.player.inv)) {
        for (let i = 0; i < obj.player.inv.length && p.inv.length < C.INV_SIZE; i++) {
          const it = DC.Save.readItem(obj.player.inv[i], null);
          if (it) p.inv.push(it);
        }
      }
      const pot = obj.player.potions || {};
      p.potions = {
        heal: int(pot.heal, 0, 999, 0), mana: int(pot.mana, 0, 999, 0),
        greaterHeal: int(pot.greaterHeal, 0, 999, 0),
      };
      DC.Inv.applyStats(p);
      p.gold = int(obj.player.gold, 0, 1e9, 0);
      p.hp = num(obj.player.hp, 1, p.maxHp, p.maxHp);
      p.mp = num(obj.player.mp, 0, p.maxMp, p.maxMp);
      p.aim = num(obj.player.aim, -7, 7, 0);
      game.player = p;

      game.stats = {
        kills: int(obj.stats && obj.stats.kills, 0, 1e7, 0),
        goldEarned: int(obj.stats && obj.stats.goldEarned, 0, 1e9, 0),
        time: num(obj.stats && obj.stats.time, 0, 1e7, 0),
        meleeHits: int(obj.stats && obj.stats.meleeHits, 0, 1e7, 0),
        chests: int(obj.stats && obj.stats.chests, 0, 1e7, 0),
        urns: int(obj.stats && obj.stats.urns, 0, 1e7, 0),
        potions: int(obj.stats && obj.stats.potions, 0, 1e7, 0),
      };
      game.logs = [];
      game.invSel = 0;
      game.invHover = null;
      game.loreCard = null;
      game.pendingLore = false;
      game.shop = null;
      game.transition = null;

      // Rebuild the floor from the seed. This puts the actor on the stair with
      // a fresh level, which is exactly the base the deltas below expect.
      game.startLevel(depth);
      const w = game.world;
      w.actor = p;

      const lv = obj.level || {};
      if (Array.isArray(lv.demons)) {
        for (let k = 0; k < lv.demons.length; k++) {
          const rec = lv.demons[k];
          if (!Array.isArray(rec)) continue;
          const i = idx(rec[0], w.demons.length);
          if (i < 0) continue;
          const d = w.demons[i];
          d.x = num(rec[1], 0, C.WORLD_M, d.x);
          d.y = num(rec[2], 0, C.WORLD_M, d.y);
          const hp = num(rec[3], -1, d.maxHp, d.maxHp);
          if (hp <= 0) { d.dead = true; d.deadT = 9; d.hp = 0; }
          else d.hp = hp;
          d.hasSeen = false; d.windup = 0; d.attackCd = 0; d.kx = 0; d.ky = 0;
        }
        w.awakeCount = 0;
      }
      const opened = indexList(lv.chestsOpened, w.chests.length);
      for (let k = 0; k < opened.length; k++) { w.chests[opened[k]].opened = true; w.chests[opened[k]].lid = 0; }
      const broken = indexList(lv.urnsBroken, w.urns.length);
      for (let k = 0; k < broken.length; k++) w.urns[broken[k]].broken = true;
      if (w.merchant && w.merchant.stock) {
        const sold = indexList(lv.merchantSold, w.merchant.stock.length);
        for (let k = 0; k < sold.length; k++) w.merchant.stock[sold[k]].sold = true;
      }
      if (w.boss && lv.boss && typeof lv.boss === 'object') {
        if (lv.boss.dead) { w.boss.dead = true; w.boss.deadT = 9; w.boss.hp = 0; }
        else w.boss.hp = num(lv.boss.hp, 1, w.boss.maxHp, w.boss.maxHp);
        w.boss.awake = !!lv.boss.awake && !w.boss.dead;
      }
      if (w.portal && lv.portal && typeof lv.portal === 'object') {
        w.portal.discovered = !!lv.portal.discovered;
        /* A boss gate moves when the Sovereign dies, so the file has to say
           where it ended up. A maze gate is rebuilt from the seed and lands
           back on the same tile anyway, so this is only honoured when the tile
           is real, open floor on the floor being rebuilt. */
        if (typeof lv.portal.tx === 'number' && typeof lv.portal.ty === 'number') {
          const ptx = int(lv.portal.tx, 0, C.GRID - 1, w.portal.tx);
          const pty = int(lv.portal.ty, 0, C.GRID - 1, w.portal.ty);
          if (w.grid[pty * C.GRID + ptx] === 1) {
            w.portal.tx = ptx; w.portal.ty = pty;
            w.portal.x = (ptx + 0.5) * C.TILE;
            w.portal.y = (pty + 0.5) * C.TILE;
          }
        }
        // A boss portal only opens with the boss dead; never let a file claim
        // both, or a save could skip the fight.
        w.portal.active = !!lv.portal.active && (!w.isBoss || !w.boss || w.boss.dead);
      }
      const seen = fromRuns(lv.seen, w.discovered.length);
      for (let i = 0; i < seen.length; i++) if (seen[i]) w.discovered[i] = 1;

      // The tile you were standing on must be known, or you resume inside your
      // own fog with the floor drawn black under your feet.
      const tx = Math.floor(p.x / C.TILE), ty = Math.floor(p.y / C.TILE);
      if (tx >= 0 && ty >= 0 && tx < C.GRID && ty < C.GRID) w.discovered[ty * C.GRID + tx] = 1;

      p.x = num(obj.player.x, 0, C.WORLD_M, w.start.x);
      p.y = num(obj.player.y, 0, C.WORLD_M, w.start.y);
      if (DC.isSolid(w, Math.floor(p.x / C.TILE), Math.floor(p.y / C.TILE))) {
        p.x = w.start.x; p.y = w.start.y;
      }
      p.kx = 0; p.ky = 0;
      DC.Camera.snap(p);
      DC.Audio.setDepth(depth);
      DC.Audio.setScene(w.isBoss ? 'boss' : 'dungeon');
      DC.Render.pickPalette(depth);
      DC.Fog.discover(w, p);

      game.banner = { title: 'DEPTH ' + depth, sub: 'Picked back up where you left it.', life: 2.6, maxLife: 2.6, color: '#8ef0c0' };
      game.log('You take hold of the taper again. Depth ' + depth + '.', '#8ef0c0');
      // Say it out loud: the career they saved with is not the one they are
      // holding, and a knight moves and hits differently from what they left.
      if (wantCls !== obj.player.classId) {
        game.log('The hands you come back in are not the ones you saved with. You stand as a '
          + DC.CLASSES[wantCls].name + '.', '#ffd166');
      }
      return { ok: true, depth: depth, classId: p.classId };
    },

    /* Equipment is plain data, but a file could put anything in these slots. */
    readItem: function (raw, wantType) {
      if (!raw || typeof raw !== 'object') return null;
      const type = raw.type;
      if (type !== 'weapon' && type !== 'armor') return null;
      if (wantType && type !== wantType) return null;
      const ilvl = int(raw.ilvl, 1, 100000, 1);
      const out = {
        type: type,
        name: String(raw.name || (type === 'weapon' ? 'Salvaged blade' : 'Salvaged plate')).slice(0, 64),
        ilvl: ilvl,
        quality: int(raw.quality, 0, 8, 1),
        qualityName: String(raw.qualityName || 'Sound').slice(0, 24),
        color: /^#[0-9a-fA-F]{3,8}$/.test(String(raw.color)) ? String(raw.color) : '#d7dee9',
        value: int(raw.value, 1, 1e7, 10),
        weight: int(raw.weight, 0, 2, 0),
        weightName: String(raw.weightName || 'light').slice(0, 12),
        penalty: Math.round(num(raw.penalty, 0, 4, 0) * 100) / 100,
      };
      if (type === 'weapon') out.atk = int(raw.atk, 1, 1e6, Math.max(1, Math.round(2.1 + 0.95 * ilvl)));
      else out.def = int(raw.def, 1, 1e6, Math.max(1, Math.round(1.1 + 0.6 * ilvl)));
      return out;
    },

    /* ---------------- the file itself ---------------- */
    toJSON: function (game) { return JSON.stringify(DC.Save.serialize(game), null, 1); },

    download: function (game) {
      const name = DC.Save.fileName(game);
      let text;
      try { text = DC.Save.toJSON(game); } catch (e) { return { ok: false, error: 'Could not write the save: ' + e.message }; }
      const doc = global.document;
      if (!doc) return { ok: false, error: 'No document to save from.' };

      // iOS Safari ignores <a download>, but its share sheet offers "Save to
      // Files" -- which is exactly what a phone player needs. Prefer it when the
      // browser says it can share a file, and fall back to the anchor otherwise.
      if (global.File && global.Blob && global.navigator && global.navigator.canShare) {
        try {
          const file = new global.File([text], name, { type: 'application/json' });
          if (global.navigator.canShare({ files: [file] }) && global.navigator.share) {
            const p = global.navigator.share({ files: [file] });
            if (p && p.catch) p.catch(function () { /* dismissed: nothing to do */ });
            return { ok: true, name: name, bytes: text.length, shared: true };
          }
        } catch (e) { /* no File support after all -- use the anchor */ }
      }

      const link = doc.getElementById('save-link');
      let url = '';
      try {
        if (global.Blob && global.URL && global.URL.createObjectURL) {
          url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        } else {
          url = 'data:application/json;charset=utf-8,' + encodeURIComponent(text);
        }
      } catch (e) {
        url = 'data:application/json;charset=utf-8,' + encodeURIComponent(text);
      }
      if (!link) {
        // No anchor in the page: hand the text back so the caller can show it.
        return { ok: true, text: text, name: name, inline: true };
      }
      link.setAttribute('href', url);
      link.setAttribute('download', name);
      link.click();
      if (url.indexOf('blob:') === 0 && global.URL.revokeObjectURL) {
        global.setTimeout(function () { global.URL.revokeObjectURL(url); }, 8000);
      }
      return { ok: true, name: name, bytes: text.length };
    },

    parse: function (text) {
      let obj = null;
      try { obj = JSON.parse(text); } catch (e) { return { ok: false, error: 'That is not readable JSON.' }; }
      if (!DC.Save.valid(obj)) {
        if (obj && obj.format === FORMAT) return { ok: false, error: 'Save version ' + obj.version + ' is not this version (' + VERSION + ').' };
        return { ok: false, error: 'That file is not a Hollow Deep save.' };
      }
      return { ok: true, save: obj };
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
