/* Everything you hear is generated at runtime with WebAudio: an adaptive
   procedural soundtrack that changes with depth and boss rooms, and synthesised
   sound effects for swings, hits, grunts, roars, deaths, magic, chests, coins
   and portals. No audio files. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const MINOR = [0, 2, 3, 5, 7, 8, 10];

  /* A mode is a mood. Natural minor is the dungeon's default; a throne that
     sits on a Phrygian third sounds like a door being dragged shut, and one on
     a Locrian sixth sounds like something wearing a person. */
  const MODES = {
    minor: [0, 2, 3, 5, 7, 8, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    harmonic: [0, 2, 3, 5, 7, 8, 11],
    locrian: [0, 1, 3, 5, 6, 8, 10],
  };

  /* Four progressions were the dungeon's. The thrones get two more that never
     resolve back to the first chord, which is what a fight that is not going
     your way is supposed to sound like. */
  const PROGRESSIONS = [
    [0, 5, 3, 4], [0, 3, 4, 5], [0, 5, 4, 3], [0, 4, 5, 3],
    [0, 3, 5, 4], [0, 6, 4, 1],
    // The seventh one is the only progression in the game that comes back to
    // where it started. It is used once, by the ending.
    [0, 3, 4, 0],
  ];

  /* The ending is not a fight, so it does not get fight music. Same engine,
     but: no drums at all, a Dorian sixth so the chords have somewhere to
     land, the coming-home progression above, a melody that walks down rather
     than paces, and a bell instead of a lead that wants to argue. */
  const ENDING_MUSIC = {
    bpm: 52, key: 0, prog: 6, mode: 'dorian',
    motif: [0, 4, 2, 0, 4, 7, 4, 0], lead: 'bell',
  };

  /* Which sixteenths the drums take. A march is a thing that walks at you, a
     pulse is a thing that never stops, a triplet is a thing that sways, and
     'still' is a thing that does not need rhythm at all. */
  const DRUMS = {
    war: { kick: [0, 6, 8, 14], tom: [12], hat: [2, 6, 10, 14] },
    march: { kick: [0, 8], tom: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
    triplet: { kick: [0, 8], tom: [11], hat: [0, 3, 6, 9, 12, 15] },
    pulse: { kick: [0, 4, 8, 12], tom: [], hat: [2, 6, 10, 14] },
    slow: { kick: [0], tom: [8], hat: [4, 12] },
    still: { kick: [], tom: [], hat: [] },
  };

  function degToSemi(deg, mode) {
    const sc = MODES[mode] || MINOR;
    const n = sc.length;
    const o = Math.floor(deg / n);
    const d = ((deg % n) + n) % n;
    return o * 12 + sc[d];
  }

  const A = {
    ctx: null, master: null, musicGain: null, sfxGain: null,
    noise: null, started: false, muted: false, failed: false,
    scene: 'menu', depth: 1, intensity: 0, bossMusic: null,
    step: 0, nextTime: 0, bpm: 84, root: 45, progression: 0,
    lastHeartbeat: 0,

    init: function () {
      if (A.ctx || A.failed) return;
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) { A.failed = true; return; }
      try {
        A.ctx = new AC();
        A.master = A.ctx.createGain();
        A.master.gain.value = 0.9;
        const comp = A.ctx.createDynamicsCompressor();
        try {
          comp.threshold.value = -14; comp.knee.value = 24;
          comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.25;
        } catch (e) { /* older impls expose plain objects */ }
        A.master.connect(comp);
        comp.connect(A.ctx.destination);

        A.musicGain = A.ctx.createGain(); A.musicGain.gain.value = 0.0;
        A.sfxGain = A.ctx.createGain(); A.sfxGain.gain.value = 0.85;
        A.musicGain.connect(A.master);
        A.sfxGain.connect(A.master);

        // shared noise buffer
        const len = Math.floor(A.ctx.sampleRate * 1.2);
        const buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        A.noise = buf;

        // a feedback delay on the music bus for cave feel
        const delay = A.ctx.createDelay(1.0);
        delay.delayTime.value = 0.28;
        const fb = A.ctx.createGain(); fb.gain.value = 0.34;
        const wet = A.ctx.createGain(); wet.gain.value = 0.3;
        A.musicGain.connect(delay);
        delay.connect(fb); fb.connect(delay);
        delay.connect(wet); wet.connect(A.master);
        A.musicDelay = delay;
      } catch (e) { A.failed = true; A.ctx = null; return; }
    },

    resume: function () {
      A.init();
      if (!A.ctx) return;
      if (A.ctx.state === 'suspended') A.ctx.resume();
      if (!A.started) {
        A.started = true;
        A.nextTime = A.ctx.currentTime + 0.1;
        A.setScene('menu');
      }
    },

    toggleMute: function () {
      A.muted = !A.muted;
      if (A.master) A.master.gain.value = A.muted ? 0 : 0.9;
      return A.muted;
    },

    setDepth: function (d) {
      A.depth = d;
      A.root = 45 + ((Math.floor((d - 1) / 5) * 2) % 12);
      A.progression = Math.floor((d - 1) / DC.C.BOSS_EVERY) % 4;
    },

    /* Every throne plays its own song. The score rides on the Sovereign (see
       DC.LORE.bosses): tempo, key, mode, the melodic motif, the drum feel and
       the one instrument that belongs only to it -- an anvil, a choir, a roar
       in the low register. It is set the moment the door opens, and an echo of
       a Sovereign comes back wearing its original music. */
    setBoss: function (boss) {
      A.bossMusic = (boss && boss.music) || null;
    },

    setScene: function (name) {
      A.scene = name;
      if (!A.ctx) return;
      const g = A.musicGain.gain;
      const t = A.ctx.currentTime;
      const target = name === 'none' ? 0 : (name === 'menu' ? 0.22 : name === 'dead' ? 0.18 : name === 'ending' ? 0.26 : 0.3);
      g.cancelScheduledValues && g.cancelScheduledValues(t);
      g.setValueAtTime && g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime && g.linearRampToValueAtTime(target, t + 1.1);
      A.bpm = name === 'boss' ? (A.bossMusic ? A.bossMusic.bpm : 104)
        : name === 'menu' ? 68 : name === 'dead' ? 56 : name === 'ending' ? ENDING_MUSIC.bpm : 84;
      A.step = 0;
      A.nextTime = Math.max(A.nextTime, A.ctx.currentTime + 0.05);
    },

    setIntensity: function (v) { A.intensity = M.clamp(v, 0, 1); },

    /* ---------------- music scheduler ---------------- */
    update: function (dt) {
      if (!A.ctx || !A.started || A.muted) return;
      const now = A.ctx.currentTime;
      const stepDur = 60 / A.bpm / 4; // 16th
      let guard = 0;
      while (A.nextTime < now + 0.25 && guard++ < 64) {
        A.scheduleStep(A.step, A.nextTime, stepDur);
        A.step = (A.step + 1) % 64;
        A.nextTime += stepDur;
      }
    },

    scheduleStep: function (step, t, dur) {
      const scene = A.scene;
      const bar = Math.floor(step / 16) % 4;
      const beat = step % 16;
      const B = scene === 'boss' ? A.bossMusic : null;
      const E = scene === 'ending' ? ENDING_MUSIC : null;
      const S = B || E;
      const prog = PROGRESSIONS[(S ? S.prog : A.progression) % PROGRESSIONS.length];
      const chordDeg = prog[bar];
      const mode = S ? S.mode : 'minor';
      const root = A.root + (S ? S.key : 0);

      // Drone on bar starts.
      if (step === 0) {
        A.drone(mtof(root - 12), t, dur * 16 * (scene === 'boss' ? 0.75 : E ? 2.5 : 1));
      }

      // Pad chord every half bar.
      if (beat === 0 || beat === 8) {
        const r = root + degToSemi(chordDeg, mode);
        A.pad(mtof(r), mtof(r + degToSemi(2, mode)), mtof(r + degToSemi(4, mode)), t, dur * (E ? 16 : 8),
          scene === 'boss' ? 0.09 : E ? 0.075 : 0.06);
        if (scene === 'boss' && beat === 8) A.pad(mtof(r + 1), mtof(r + degToSemi(2, mode) + 1), mtof(r + 13), t, dur * 6, 0.035);
        // A hymn is a chord with somebody singing over it, not a chord alone.
        if (E && beat === 8) A.pad(mtof(r + 12), mtof(r + degToSemi(4, mode) + 12), mtof(r + degToSemi(2, mode) + 12), t, dur * 8, 0.03);
      }

      // Arp / melody.
      const arpOn = scene === 'menu' ? (beat % 4 === 0)
        : E ? (beat % 8 === 0)
        : (beat % 2 === 0 || (A.intensity > 0.5 && beat % 2 === 1));
      if (arpOn) {
        const pattern = S ? S.motif : [0, 2, 4, 2, 6, 4, 2, 0];
        const idx = (step * 3 + bar) % pattern.length;
        const deg = chordDeg + pattern[idx];
        const oct = 12;
        const vel = beat % 4 === 0 ? 1 : 0.62;
        A.voice(S ? S.lead : 'pluck', mtof(root + degToSemi(deg, mode) + oct), t,
          vel * (scene === 'boss' ? 0.075 : E ? 0.06 : 0.055));
      }

      // Percussion.
      if (scene === 'dungeon' || scene === 'boss') {
        if (B) {
          const d = DRUMS[B.drums] || DRUMS.war;
          if (d.kick.indexOf(beat) >= 0) A.kick(t, beat % 8 === 0 ? 0.5 : 0.34);
          if (d.tom.indexOf(beat) >= 0) A.tom(t, 0.22);
          if (d.hat.indexOf(beat) >= 0) A.hat(t, 0.11);
        } else {
          if (beat % 8 === 0) A.kick(t, 0.32);
          if (beat % 4 === 2) A.hat(t, 0.06);
        }
        if (A.intensity > 0.35 && beat % 2 === 0) A.hat(t, 0.035);
      }

      // The last beat of every bar of the hymn lands on the chord it is
      // standing on, which is the sound of a thing finally being over.
      if (E && beat === 12) A.bell(mtof(root + degToSemi(chordDeg, mode) + 12), t, 0.055);

      // Sparse high bell in dungeon for unease.
      if (scene === 'dungeon' && step === 47 && Math.random() < 0.5) {
        A.bell(mtof(root + 24 + MINOR[Math.floor(Math.random() * 7)]), t, 0.05);
      }
      // Each throne signs one bar of its own. This is the sound you hear down
      // the corridor before you hear the feet, and no two thrones sign alike.
      if (B) A.accent(B.accent, root, t, dur, mode, step);
    },

    /* The lead voice, chosen per throne: a plucked string, a bell, a bowed
       saw, or a pair of reeds breathing slightly out of tune with each other. */
    voice: function (kind, freq, t, lvl) {
      if (kind === 'bell') { A.bell(freq, t, lvl * 1.1); return; }
      if (kind === 'saw') { A.reed(freq, t, lvl, 'sawtooth'); return; }
      if (kind === 'reeds') { A.reed(freq, t, lvl, 'triangle'); return; }
      A.pluck(freq, t, lvl);
    },

    reed: function (freq, t, lvl, type) {
      const c = A.ctx;
      const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
      const o2 = c.createOscillator(); o2.type = type; o2.frequency.value = freq * 1.006;
      const f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = freq * 4 + 400; f.Q.value = 2.5;
      const g = c.createGain();
      o.connect(f); o2.connect(f); f.connect(g); g.connect(A.musicGain);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(lvl, t + 0.07);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
      o.start(t); o2.start(t); o.stop(t + 1.05); o2.stop(t + 1.05);
    },

    /* The one instrument that belongs to a single Sovereign. */
    accent: function (kind, root, t, dur, mode, step) {
      if (kind === 'anvil' && (step === 8 || step === 47)) {
        // Ashvane keeps the ledger; Vaurn swallowed the gatehouse. Both are
        // paid in iron.
        A.noiseBurst(t, 0.12, 0.5, 'bandpass', 1900, 7, 700, A.musicGain);
        A.tom(t, 0.2);
      } else if (kind === 'roar' && step === 47) {
        A.tone(t, 0.16, 1.8, 'sawtooth', mtof(root - 24), mtof(root - 24) * 0.66, A.musicGain);
      } else if (kind === 'choir' && (step === 16 || step === 47)) {
        const r = root + degToSemi(4, mode);
        A.pad(mtof(r + 12), mtof(r + 13), mtof(r + 19), t, dur * 6, 0.032);
      } else if (kind === 'strings' && (step === 24 || step === 56)) {
        A.reed(mtof(root + 12), t, 0.05, 'sawtooth');
        A.reed(mtof(root + degToSemi(4, mode) + 12), t + dur * 2, 0.04, 'sawtooth');
      } else if (kind === 'bell' && step === 47) {
        A.bell(mtof(root + 24 + degToSemi(4, mode)), t, 0.05);
      }
    },

    drone: function (freq, t, dur) {
      const c = A.ctx;
      const g = c.createGain();
      g.gain.value = 0;
      const f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 320; f.Q.value = 3;
      const o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = freq;
      const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = freq * 1.006;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(A.musicGain);
      const lvl = A.scene === 'boss' ? 0.16 : 0.11;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(lvl, t + 1.4);
      g.gain.linearRampToValueAtTime(lvl * 0.6, t + dur * 0.8);
      g.gain.linearRampToValueAtTime(0, t + dur + 1.2);
      o1.start(t); o2.start(t); o1.stop(t + dur + 1.4); o2.stop(t + dur + 1.4);
    },

    pad: function (a, b, cc, t, dur, lvl) {
      const c = A.ctx;
      const g = c.createGain();
      g.gain.value = 0;
      const f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 1400;
      g.connect(A.musicGain); f.connect(g);
      const oscs = [];
      [a, b, cc].forEach(function (freq, i) {
        const o = c.createOscillator();
        o.type = i === 1 ? 'triangle' : 'sine';
        o.frequency.value = freq;
        o.detune.value = (i - 1) * 5;
        o.connect(f); o.start(t); o.stop(t + dur + 1.6);
        oscs.push(o);
      });
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(lvl, t + 0.9);
      g.gain.linearRampToValueAtTime(0, t + dur + 1.2);
    },

    pluck: function (freq, t, lvl) {
      const c = A.ctx;
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
      const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2;
      const g = c.createGain();
      const g2 = c.createGain(); g2.gain.value = 0.35;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq * 2.2; f.Q.value = 1.4;
      o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(A.musicGain);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(lvl, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.start(t); o2.start(t); o.stop(t + 0.6); o2.stop(t + 0.6);
    },

    kick: function (t, lvl) {
      const c = A.ctx;
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
      const g = c.createGain();
      g.gain.setValueAtTime(lvl, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g); g.connect(A.musicGain);
      o.start(t); o.stop(t + 0.3);
    },

    hat: function (t, lvl) {
      const c = A.ctx;
      const s = c.createBufferSource(); s.buffer = A.noise;
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500;
      const g = c.createGain();
      g.gain.setValueAtTime(lvl, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      s.connect(f); f.connect(g); g.connect(A.musicGain);
      s.start(t); s.stop(t + 0.08);
    },

    tom: function (t, lvl) {
      const c = A.ctx;
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.25);
      const g = c.createGain();
      g.gain.setValueAtTime(lvl, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g); g.connect(A.musicGain);
      o.start(t); o.stop(t + 0.4);
    },

    bell: function (freq, t, lvl) {
      const c = A.ctx;
      [1, 2.02, 3.4].forEach(function (h, i) {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq * h;
        const g = c.createGain();
        g.gain.setValueAtTime(lvl / (i + 1), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6 / (i + 1));
        o.connect(g); g.connect(A.musicGain);
        o.start(t); o.stop(t + 1.8);
      });
    },

    /* ---------------- sfx ---------------- */
    env: function (node, t, peak, attack, decay) {
      node.gain.setValueAtTime(0.0001, t);
      node.gain.linearRampToValueAtTime(peak, t + attack);
      node.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    },

    noiseBurst: function (t, lvl, dur, type, freq, q, sweepTo, dest) {
      const c = A.ctx;
      const s = c.createBufferSource(); s.buffer = A.noise;
      s.playbackRate.value = 1;
      const f = c.createBiquadFilter();
      f.type = type || 'bandpass';
      f.frequency.setValueAtTime(freq, t);
      if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
      f.Q.value = q == null ? 1 : q;
      const g = c.createGain();
      A.env(g, t, lvl, 0.005, dur);
      s.connect(f); f.connect(g); g.connect(dest || A.sfxGain);
      s.start(t); s.stop(t + dur + 0.05);
      return { s: s, f: f, g: g };
    },

    tone: function (t, lvl, dur, type, f0, f1, dest) {
      const c = A.ctx;
      const o = c.createOscillator();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      const g = c.createGain();
      A.env(g, t, lvl, 0.006, dur);
      o.connect(g); g.connect(dest || A.sfxGain);
      o.start(t); o.stop(t + dur + 0.05);
      return { o: o, g: g };
    },

    /* The sound of a body being somewhere else than it was. Low, wooden, with
       grit in it. oomph is the weight of the blow, bite how much of it is
       armour and gravel rather than flesh, pitch where the thud starts. */
    impact: function (t, lvl, oomph, bite, pitch) {
      const c = A.ctx;
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(pitch, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(24, pitch * 0.42), t + 0.16);
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.Q.value = 1.2;
      f.frequency.setValueAtTime(Math.max(160, pitch * 3.4), t);
      f.frequency.exponentialRampToValueAtTime(Math.max(80, pitch * 0.9), t + 0.14);
      const g = c.createGain();
      A.env(g, t, lvl * oomph, 0.004, 0.2);
      o.connect(f); f.connect(g); g.connect(A.sfxGain);
      o.start(t); o.stop(t + 0.26);
      A.noiseBurst(t, lvl * bite, 0.1, 'bandpass', 520 * bite, 0.9, 240 * bite);
      return { o: o, f: f, g: g };
    },

    play: function (name, opts) {
      if (!A.ctx || A.muted || A.failed) return;
      opts = opts || {};
      const p = opts.pitch == null ? 1 : opts.pitch;
      const t = A.ctx.currentTime + 0.001;
      try {
        switch (name) {
          case 'swing':
            A.noiseBurst(t, 0.22, 0.16, 'bandpass', 900 * p, 1.1, 2600 * p);
            break;
          case 'hit':
            A.impact(t, 0.34, 1.0, 1.0, 150 * p);
            break;
          case 'bossHit':
            // Hitting a Sovereign is hitting a wall that is still angry.
            A.impact(t, 0.4, 1.3, 0.8, 110 * p);
            A.noiseBurst(t, 0.12, 0.14, 'bandpass', 900, 3.0, 420);
            break;
          case 'cast':
            A.tone(t, 0.2, 0.22, 'sawtooth', 720 * p, 240 * p);
            A.tone(t + 0.01, 0.12, 0.18, 'sine', 1400 * p, 500 * p);
            break;
          case 'magicHit':
            // Still a spell, but it lands on a body: the fizz drops away and a
            // soft thud arrives underneath it.
            A.noiseBurst(t, 0.16, 0.2, 'bandpass', 1150, 1.2, 360);
            A.impact(t, 0.2, 0.7, 0.5, 170 * p);
            break;
          case 'spot':
            A.tone(t, 0.24, 0.26, 'sawtooth', 260 * p, 150 * p);
            A.noiseBurst(t, 0.08, 0.2, 'bandpass', 700 * p, 4);
            break;
          case 'grunt':
            A.tone(t, 0.2, 0.2, 'square', 180 * p, 120 * p);
            break;
          case 'demonDeath':
            A.tone(t, 0.26, 0.5, 'sawtooth', 320 * p, 70 * p);
            A.noiseBurst(t, 0.16, 0.45, 'lowpass', 1600, 1.2, 300);
            break;
          case 'roar':
            A.tone(t, 0.34, 1.1, 'sawtooth', 150 * p, 60 * p);
            A.tone(t + 0.05, 0.2, 1.0, 'square', 92 * p, 44 * p);
            A.noiseBurst(t, 0.2, 1.0, 'bandpass', 420, 2.4, 180);
            break;
          case 'bossDeath':
            A.tone(t, 0.34, 1.8, 'sawtooth', 180, 40);
            A.noiseBurst(t, 0.24, 1.6, 'bandpass', 900, 1.4, 120);
            A.bell(mtof(A.root + 24), t + 0.4, 0.12);
            break;
          case 'slam':
            A.tone(t, 0.4, 0.4, 'sine', 150 * p, 42 * p);
            A.noiseBurst(t, 0.26, 0.3, 'lowpass', 900, 0.9, 200);
            break;
          case 'playerHurt':
            A.impact(t, 0.36, 1.15, 0.9, 135 * p);
            break;
          case 'smash':
            // An urn breaking is a heavy thing coming apart, not a chandelier
            // of little bells: the shards are an octave lower and duller.
            A.noiseBurst(t, 0.26, 0.2, 'bandpass', 700 * p, 1.4, 320 * p);
            A.tone(t, 0.16, 0.18, 'triangle', 210 * p, 92 * p);
            [0, 1, 2].forEach(function (i) { A.tone(t + 0.012 * i, 0.06, 0.13, 'triangle', (420 + i * 130) * p, (240 + i * 70) * p); });
            break;
          case 'chest':
            [0, 4, 7, 12].forEach(function (h, i) { A.bell(mtof(64 + h), t + i * 0.07, 0.1); });
            A.noiseBurst(t, 0.1, 0.2, 'bandpass', 2600, 1.6, 900);
            break;
          case 'coin':
            A.tone(t, 0.14, 0.1, 'sine', 1180, 1180);
            A.tone(t + 0.06, 0.12, 0.14, 'sine', 1560, 1560);
            break;
          case 'portal':
            A.tone(t, 0.2, 1.2, 'sine', 180, 620);
            A.tone(t + 0.05, 0.14, 1.1, 'triangle', 270, 880);
            A.noiseBurst(t, 0.1, 1.1, 'bandpass', 600, 3.0, 3200);
            break;
          case 'portalReveal':
            [0, 7, 12].forEach(function (h, i) { A.bell(mtof(69 + h), t + i * 0.12, 0.12); });
            break;
          case 'levelDown':
            A.noiseBurst(t, 0.26, 0.9, 'bandpass', 300, 1.2, 2400);
            A.tone(t, 0.2, 0.9, 'sine', 90, 220);
            break;
          case 'buy':
            A.tone(t, 0.14, 0.1, 'sine', 900, 1300);
            A.tone(t + 0.08, 0.12, 0.16, 'sine', 1300, 1700);
            break;
          case 'empty':
            A.tone(t, 0.16, 0.16, 'square', 160, 110);
            break;
          case 'drink':
            for (let i = 0; i < 4; i++) A.tone(t + i * 0.06, 0.12, 0.1, 'sine', 420 + i * 160, 620 + i * 180);
            break;
          case 'dodge':
            // A short breath of cloth and dust, not a spell: it should read as
            // feet, and it should sit under the ability it shares a thumb with.
            A.noiseBurst(t, 0.16, 0.18, 'bandpass', 1400, 1.2, 420);
            A.tone(t, 0.07, 0.14, 'triangle', 320, 180);
            break;
          case 'blink':
            A.tone(t, 0.2, 0.24, 'sine', 1500, 320);
            A.noiseBurst(t, 0.12, 0.2, 'bandpass', 3000, 2.0, 800);
            break;
          case 'whirl':
            A.noiseBurst(t, 0.26, 0.45, 'bandpass', 500, 1.0, 2600);
            A.tone(t, 0.14, 0.4, 'triangle', 220, 420);
            break;
          case 'shield':
            A.tone(t, 0.18, 0.4, 'square', 260, 620);
            A.noiseBurst(t, 0.1, 0.35, 'bandpass', 2200, 2.4, 900);
            break;
          case 'uiMove': A.tone(t, 0.08, 0.06, 'triangle', 620, 620); break;
          case 'uiSelect': A.tone(t, 0.12, 0.1, 'triangle', 760, 1020); break;
          case 'levelUp':
            [0, 4, 7, 12, 16].forEach(function (h, i) { A.bell(mtof(65 + h), t + i * 0.09, 0.12); });
            break;
          case 'heartbeat':
            A.tone(t, 0.3, 0.18, 'sine', 70, 45);
            A.tone(t + 0.16, 0.2, 0.16, 'sine', 62, 40);
            break;
          case 'death':
            A.tone(t, 0.34, 2.2, 'sawtooth', 220, 40);
            A.noiseBurst(t, 0.2, 2.0, 'lowpass', 1200, 1.0, 120);
            break;
          default: break;
        }
      } catch (e) { /* never let audio break the game */ }
    },
  };

  DC.Audio = A;
})(typeof window !== 'undefined' ? window : globalThis);
