/* Seeded RNG (mulberry32) plus deterministic per-tile hashing for decoration. */
(function (global) {
  'use strict';
  const DC = global.DC;

  function RNG(seed) {
    this.s = (seed >>> 0) || 0x9e3779b9;
  }

  RNG.prototype.next = function () {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // [a, b)
  RNG.prototype.range = function (a, b) { return a + this.next() * (b - a); };
  // inclusive integer
  RNG.prototype.int = function (a, b) { return a + Math.floor(this.next() * (b - a + 1)); };
  RNG.prototype.chance = function (p) { return this.next() < p; };
  RNG.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  RNG.prototype.shuffle = function (arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };
  // roughly -1..1, biased to small
  RNG.prototype.jitter = function () { return this.next() * 2 - 1; };

  DC.RNG = RNG;

  // Stable hash of a tile coordinate + seed, in [0,1). Used for rubble, cracks
  // and floor tint so a level looks the same every time you look at it.
  DC.hash2 = function (x, y, seed) {
    let h = (seed ^ 0x165667b1) >>> 0;
    h = Math.imul(h ^ (x * 0x27d4eb2d), 0x85ebca6b);
    h = Math.imul(h ^ (y * 0x165667b1), 0xc2b2ae35);
    h ^= h >>> 15;
    h = Math.imul(h, 0x27d4eb2d);
    h ^= h >>> 13;
    return (h >>> 0) / 4294967296;
  };

  // Used by cosmetic helpers that want randomness without threading a seed.
  DC.fallbackRng = new DC.RNG(0x51ed2701);
})(typeof window !== 'undefined' ? window : globalThis);
