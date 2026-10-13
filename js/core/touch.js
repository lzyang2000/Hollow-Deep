/* Touch control: two sticks, and the buttons that sit beside them.

   The lower half of the glass is split down the middle. The left thumb lands
   anywhere on its half and walks from wherever it landed -- a floating
   joystick, so it never has to find a ring in the dark. The right thumb lands
   anywhere on its half and swings for as long as it is held: push it and the
   blow goes that way, leave it parked and the swing finds the nearest demon in
   the light. Walking north while hitting east is then one gesture per thumb,
   which is the one thing a single fingertip can never do -- a fingertip is one
   point on the glass, and one point can only ever be the direction you are
   walking.

   One hand still works. Above the sticks the glass is open, and a finger there
   keeps both of its old jobs: it walks from where it landed and it IS the
   reticle, so a tap still hits what you tapped. A tap up there is also how you
   trade with the merchant or step down a portal standing under you.

   A drag on the open glass never swings on its own: a swing is a decision --
   the right stick, a tap, or the DODGE and ABILITY rings -- otherwise every
   shuffle to the counter becomes a brawl. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;

  const DEAD = 14;      // px before a touch counts as a drag rather than a tap
  const TAP_TIME = 0.4; // seconds
  const STICK_DEAD = 12; // px of thumb travel before the swing stick is pointing

  /* A clock that agrees with the one input.js reads, so the compatibility mouse
     event iOS fires just after a tap can be recognised as the same finger. */
  const nowMs = function () {
    return (global.performance && global.performance.now) ? global.performance.now() : Date.now();
  };

  DC.Touch = {
    // the open-glass finger: joystick + reticle, which is how one hand plays
    id: null, ox: 0, oy: 0, cx: 0, cy: 0,
    t0: 0, moved: 0, drag: false, active: false,
    // the swing stick: held means swinging, pushed means pointing
    attack: false, attackId: null, pollAtDown: 0,
    stick: { id: null, active: false, dragged: false, ox: 0, oy: 0, cx: 0, cy: 0, dx: 0, dy: 0 },
    // the walk stick
    walkId: null,
    walk: { id: null, active: false, ox: 0, oy: 0, cx: 0, cy: 0, dx: 0, dy: 0 },
    lastTouch: 0,

    init: function (canvas, game) {
      const self = this;
      const stamp = function () { self.lastTouch = nowMs(); };
      const pos = function (e) {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      if (global.PointerEvent) {
        canvas.addEventListener('pointerdown', function (e) {
          if (e.pointerType === 'mouse') return;
          e.preventDefault();
          stamp();
          const p = pos(e);
          self.down(p.x, p.y, game, e.pointerId);
        });
        canvas.addEventListener('pointermove', function (e) {
          if (e.pointerType === 'mouse') return;
          stamp();
          const p = pos(e);
          self.move(p.x, p.y, e.pointerId);
        });
        canvas.addEventListener('pointerup', function (e) {
          if (e.pointerType === 'mouse') return;
          stamp();
          const p = pos(e);
          self.up(p.x, p.y, e.pointerId, game);
        });
        canvas.addEventListener('pointercancel', function () { self.release(); });
        global.addEventListener('blur', function () { self.release(); });
      } else {
        // Older iOS: the touch events do the same job.
        const first = function (e) {
          const t = e.changedTouches[0];
          const r = canvas.getBoundingClientRect();
          return { x: t.clientX - r.left, y: t.clientY - r.top };
        };
        canvas.addEventListener('touchstart', function (e) {
          stamp();
          const p = first(e); self.down(p.x, p.y, game, 'touch');
        }, { passive: false });
        canvas.addEventListener('touchmove', function (e) {
          e.preventDefault();
          stamp();
          const p = first(e); self.move(p.x, p.y, 'touch');
        }, { passive: false });
        canvas.addEventListener('touchend', function (e) {
          stamp();
          const p = first(e); self.up(p.x, p.y, 'touch', game);
        });
        canvas.addEventListener('touchcancel', function () { self.release(); });
      }
    },

    down: function (mx, my, game, id) {
      const L = DC.Layout;
      this.lastTouch = nowMs();
      const pid = id === undefined ? 1 : id;
      // The map panel is the same button under a thumb, and while the map is up
      // the whole glass is the button. Press, never the compatibility click that
      // follows the same tap -- that click used to close what the tap had just
      // opened, so the floor flashed for a third of a second and vanished.
      if (game.state === 'map') { game.toggleMap(); return true; }
      if (game.state !== 'playing') {
        // Menus handle their own taps through the synthesised click.
        return false;
      }

      // A button first, always. The pause tab sits on the corner of the map,
      // and a thumb there means pause, not "open the big map".
      const b = L.hitButton(game, mx, my);
      if (b) { this.act(b, game); return true; }

      // The map panel is a button too.
      if (game.onMinimap && game.onMinimap(mx, my)) { game.toggleMap(); return true; }

      // The two sticks own the lower half of the glass.
      const zone = L.zoneAt(game, mx, my);
      if (zone === 'attack') return this.downAttack(mx, my, pid);
      if (zone === 'move') return this.downWalk(mx, my, pid);

      // The open glass above them. Only one finger up there at a time: a second
      // one must not steal the aim mid-stride.
      if (this.id !== null) return false;
      this.id = pid;
      this.ox = mx; this.oy = my; this.cx = mx; this.cy = my;
      this.t0 = game.time; this.moved = 0; this.active = true;
      this.drag = true;
      // The finger is the reticle the moment it lands, so even a tap aims at the
      // thing you tapped rather than at wherever you happened to be facing --
      // unless the swing stick is out there, in which case this finger only walks.
      if (!this.stick.active) this.aimAt(mx, my);
      return true;
    },

    /* ---------------- the swing stick ----------------
       Down is a held attack: it keeps swinging for as long as the thumb stays
       on the glass, which is the whole point of giving it a thumb. The stick is
       the thumb's travel from where it landed, so the aim can be east while the
       other thumb walks north. */
    downAttack: function (mx, my, pid) {
      if (this.attackId !== null) return false;      // one swing thumb at a time
      this.attackId = pid;
      this.attack = true;
      this.pollAtDown = DC.Input.polls;
      DC.Input.firing = true;
      DC.Input.tapFrames = 0;
      const s = this.stick;
      s.id = pid; s.ox = mx; s.oy = my; s.cx = mx; s.cy = my;
      s.dx = 0; s.dy = 0; s.dragged = false; s.active = true;
      // A tap in the dark should hit what you tapped at, so the finger is the
      // reticle until the stick is actually pushed.
      if (this.id === null) this.aimAt(mx, my);
      return true;
    },

    endStick: function () {
      const s = this.stick;
      s.id = null; s.active = false; s.dragged = false; s.dx = 0; s.dy = 0;
    },

    moveStick: function (mx, my) {
      const s = this.stick;
      s.cx = mx; s.cy = my;
      const dx = mx - s.ox, dy = my - s.oy;
      if (Math.hypot(dx, dy) < STICK_DEAD) { s.dx = 0; s.dy = 0; return; }
      s.dx = dx; s.dy = dy;
      s.dragged = true;
      DC.Input.aim = Math.atan2(dy, dx);
      DC.Input.aimHold = true;
    },

    upAttack: function (mx, my, game) {
      const wasStick = this.stick.active;
      const pushed = this.stick.dragged;
      this.attack = false;
      this.attackId = null;
      this.endStick();
      // A press that never reached a simulation step could not have swung, so
      // hand it one swing rather than swallowing the tap.
      if (DC.Input.polls === this.pollAtDown) { DC.Input.tapFrames = 4; DC.Input.firing = true; }
      else if (!DC.Input.dragging) DC.Input.firing = false;
      if (!wasStick) return;
      // A stick that was never pushed was a tap: the finger was the reticle the
      // whole time, so the blow goes where the finger was. A pushed stick keeps
      // the direction it left behind -- a phone has no cursor to hand the aim
      // back to, and the last way you pointed is the way you meant.
      if (!pushed && this.id === null) {
        const a = this.aimAngle(mx, my);
        if (a !== null) DC.Input.aim = a;
      }
      if (this.id === null) DC.Input.aimHold = false;
    },

    /* ---------------- the walk stick ----------------
       Floating: it starts where the thumb lands, so the thumb can rest anywhere
       in its corner and still be ready to move. */
    downWalk: function (mx, my, pid) {
      if (this.walkId !== null) return false;
      const w = this.walk;
      this.walkId = pid;
      w.id = pid; w.ox = mx; w.oy = my; w.cx = mx; w.cy = my;
      w.dx = 0; w.dy = 0; w.active = true;
      DC.Input.touchX = 0; DC.Input.touchY = 0;
      return true;
    },

    moveWalk: function (mx, my) {
      const w = this.walk;
      w.cx = mx; w.cy = my;
      const dx = mx - w.ox, dy = my - w.oy;
      w.dx = dx; w.dy = dy;
      const input = DC.Input;
      const len = Math.hypot(dx, dy);
      // A thumb resting down is not a command to walk into a demon.
      if (len < DEAD) { input.touchX = 0; input.touchY = 0; return; }
      input.touchX = dx / len;
      input.touchY = dy / len;
    },

    upWalk: function (mx, my, game) {
      const w = this.walk;
      const travelled = Math.hypot(mx - w.ox, my - w.oy);
      this.walkId = null;
      w.id = null; w.active = false; w.dx = 0; w.dy = 0;
      DC.Input.touchX = 0; DC.Input.touchY = 0;
      // A tap on the walk stick is not a step, but it is a perfectly good way
      // to say "the thing under me" when the counter or the gate is there.
      if (travelled < DEAD && game.state === 'playing' && game.interactTarget) game.tryInteract();
    },

    /* The angle from the body to a point on the glass, or null when there is
       nothing to point at. On a phone the fingertip is the cursor, so "aim with
       your hand" has to mean this line -- not the drag delta, which is what
       walks. The crosshair you see and the blow you get are then the same. */
    aimAngle: function (mx, my) {
      const game = DC.Game;
      const p = game && game.player;
      if (!p || game.state !== 'playing') return null;
      const cam = DC.Camera;
      const dx = mx - cam.worldToScreenX(p.x);
      const dy = my - cam.worldToScreenY(p.y);
      if (Math.hypot(dx, dy) < 8) return null;   // finger on the body: keep the last aim
      return Math.atan2(dy, dx);
    },

    /* A finger resting on the glass owns the aim until it lifts, even if it is
       parked on the body itself, so a stale cursor can never take over. */
    aimAt: function (mx, my) {
      const a = this.aimAngle(mx, my);
      if (a !== null) DC.Input.aim = a;
      DC.Input.aimHold = true;
    },

    move: function (mx, my, id) {
      this.lastTouch = nowMs();
      const pid = id === undefined ? this.id : id;
      if (this.id === null && this.attackId === null && this.walkId === null) return;
      // Each thumb keeps its own job. A swing thumb never walks, and a walk
      // thumb never points.
      if (pid === this.attackId) { this.moveStick(mx, my); return; }
      if (pid === this.walkId) { this.moveWalk(mx, my); return; }
      if (pid !== this.id) return;
      this.cx = mx; this.cy = my;
      if (!this.drag) return;
      const input = DC.Input;
      const dx = mx - this.ox, dy = my - this.oy;
      this.moved = Math.max(this.moved, Math.hypot(dx, dy));
      // This finger walks only while the walk stick is not out there owning the
      // walk. Two hands: the left thumb walks, this one is the reticle.
      if (!this.walk.active && this.moved >= DEAD) {
        const len = Math.hypot(dx, dy) || 1;
        input.touchX = dx / len;
        input.touchY = dy / len;
      } else if (!this.walk.active) {
        input.touchX = 0; input.touchY = 0;
      }
      // ...and one-handed the fingertip is the reticle too: the aim is the line
      // from the body to the finger, so the crosshair on the glass is exactly
      // where the blow or the bolt goes. With the swing stick out there this
      // finger is a joystick only, and the aim belongs to the other thumb.
      if (!this.stick.active) this.aimAt(mx, my);
    },

    up: function (mx, my, id, game) {
      this.lastTouch = nowMs();
      const pid = id === undefined
        ? (this.id !== null ? this.id : (this.attackId !== null ? this.attackId : this.walkId))
        : id;
      if (this.attackId !== null && pid === this.attackId) { this.upAttack(mx, my, game); return; }
      if (this.walkId !== null && pid === this.walkId) { this.upWalk(mx, my, game); return; }
      // A thumb lifting off a stick has nothing to undo; the walk and the swing
      // belong to different fingers and never to both.
      if (this.id === null || pid !== this.id) return;

      const wasDrag = this.drag;
      const dur = game.time - this.t0;
      const far = this.moved >= DEAD;
      const input = DC.Input;
      this.id = null; this.active = false; this.drag = false;
      if (!this.walk.active) { input.touchX = 0; input.touchY = 0; }
      input.aimHold = false;
      // The walk ends with this finger. If the other thumb is still holding the
      // swing stick, its attack carries on.

      if (wasDrag && !far && dur < TAP_TIME && game.state === 'playing') {
        if (game.interactTarget) { game.tryInteract(); return; }
        // A tap in the open is one attack at the point you tapped, so you never
        // have to hold to swing. endFrame() counts the frames down and lets go.
        // The aim is set without aimHold: the finger is already off the glass,
        // and a hybrid machine with a real mouse should get its cursor back.
        const a = this.aimAngle(mx, my);
        if (a !== null) DC.Input.aim = a;
        DC.Input.tapFrames = 4;
        DC.Input.firing = true;
      }
    },

    /* Everything down: a cancel, a blur, or a screen change. */
    release: function () {
      const input = DC.Input;
      this.id = null; this.active = false; this.drag = false;
      this.attack = false; this.attackId = null;
      this.endStick();
      this.walkId = null;
      this.walk.id = null; this.walk.active = false;
      this.walk.dx = 0; this.walk.dy = 0;
      input.touchX = 0; input.touchY = 0; input.aimHold = false;
      if (!input.dragging) input.firing = false;
    },

    act: function (b, game) {
      const p = game.player;
      if (b.id === 'ability') DC.Player.ability(game.world, p, game);
      else if (b.id === 'dodge') DC.Player.dodge(game.world, p, game);
      else if (b.id === 'heal') DC.Player.drink(game.world, p, 'heal', game);
      else if (b.id === 'mana') DC.Player.drink(game.world, p, 'mana', game);
      else if (b.id === 'pack') game.openPack();
      else if (b.id === 'pause') game.setState('pause');
      else if (b.id === 'interact') game.tryInteract();
      DC.Audio.play('uiSelect');
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
