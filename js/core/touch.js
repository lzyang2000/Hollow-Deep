/* Touch control, one hand or two.

   Two hands and the game is a twin stick. The right thumb drags the field, and
   that is a joystick and nothing else: it walks. The left thumb rests on the
   wide pad in the free corner, and that pad is a trigger AND an aim stick --
   hold it to swing, slide it to point. Walking north while hitting east is then
   one gesture per thumb, which is the thing a single fingertip can never do: a
   fingertip is one point on the glass, and one point can only ever be the
   direction you are walking.

   One hand still works, on the same code. With nothing on the pad the field
   finger keeps its second job and the fingertip is the reticle, so a tap still
   hits what you tapped and a drag still aims where it points. The ATTACK circle
   in the right cluster stays a plain trigger for the walking thumb, and its
   swing finds the nearest demon in the light.

   A drag never swings on its own: a swing is a decision -- the pad, the circle,
   or a tap -- otherwise every shuffle to the merchant becomes a brawl.
   A tap (short, barely moved) is the interact gesture: merchant, portal, or one
   swing at whatever is under the finger. */
(function (global) {
  'use strict';
  const DC = global.DC;
  const M = DC.M;

  const DEAD = 14;      // px before a touch counts as a drag rather than a tap
  const TAP_TIME = 0.4; // seconds
  const STICK_DEAD = 12; // px of thumb travel before the aim stick is pointing

  /* A clock that agrees with the one input.js reads, so the compatibility mouse
     event iOS fires just after a tap can be recognised as the same finger. */
  const nowMs = function () {
    return (global.performance && global.performance.now) ? global.performance.now() : Date.now();
  };

  DC.Touch = {
    // the field finger: joystick + reticle
    id: null, ox: 0, oy: 0, cx: 0, cy: 0,
    t0: 0, moved: 0, drag: false, active: false,
    // the button finger: ATTACK, held
    attack: false, attackId: null, pollAtDown: 0,
    // the aim stick: the left-hand ATTACK pad, pushed. dx/dy are the thumb's
    // travel from where it landed, which is the direction the weapon points.
    stick: { id: null, active: false, dragged: false, ox: 0, oy: 0, cx: 0, cy: 0, dx: 0, dy: 0 },
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
      if (game.state !== 'playing') {
        // Menus handle their own taps through the synthesised click.
        return false;
      }

      const b = L.hitButton(game, mx, my);
      if (b) {
        // ATTACK is the one hold-button, and it has a finger to itself: press
        // it while the other thumb is mid-stride and both keep working.
        if (b.id === 'attack') {
          if (this.attackId !== null) return false;      // one button thumb at a time
          const pid = id === undefined ? 1 : id;
          this.attackId = pid;
          this.attack = true;
          this.pollAtDown = DC.Input.polls;
          DC.Input.firing = true;
          DC.Input.tapFrames = 0;
          // Only the wide pad becomes a stick. The circle in the right cluster
          // sits under the thumb that is already walking, so it stays a plain
          // trigger and lets the assist aim for it.
          if (b.pad) this.startStick(mx, my, pid);
          return true;
        }
        this.act(b, game);
        return true;
      }

      // The field finger is the joystick and the reticle. Only one at a time: a
      // second finger on the glass must not steal the aim mid-stride.
      if (this.id !== null) return false;
      this.id = id === undefined ? 1 : id;
      this.ox = mx; this.oy = my; this.cx = mx; this.cy = my;
      this.t0 = game.time; this.moved = 0; this.active = true;
      this.drag = true;
      // The finger is the reticle the moment it lands, so even a tap aims at the
      // thing you tapped rather than at wherever you happened to be facing --
      // unless the aim stick is out there, in which case this finger only walks.
      if (!this.stick.active) this.aimAt(mx, my);
      return true;
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

    /* A finger resting on the field owns the aim until it lifts, even if it is
       parked on the body itself, so a stale cursor can never take over. */
    aimAt: function (mx, my) {
      const a = this.aimAngle(mx, my);
      if (a !== null) DC.Input.aim = a;
      DC.Input.aimHold = true;
    },

    /* ---------------- the aim stick ----------------
       The pad is pressed wherever the thumb happens to land, so the aim is the
       thumb's travel from that landing point rather than the line from the body
       to the thumb. That is what frees the other thumb: the aim can be east
       while the walk is north, and the thumb never has to leave its corner. */
    startStick: function (mx, my, id) {
      const s = this.stick;
      s.id = id; s.ox = mx; s.oy = my; s.cx = mx; s.cy = my;
      s.dx = 0; s.dy = 0; s.dragged = false; s.active = true;
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

    move: function (mx, my, id) {
      this.lastTouch = nowMs();
      const pid = id === undefined ? this.id : id;
      if (this.id === null && this.attackId === null) return;
      // The button thumb never walks and never moves the field reticle. On the
      // pad it is the aim stick, and sliding it is the whole point.
      if (pid === this.attackId) {
        if (this.stick.active) this.moveStick(mx, my);
        return;
      }
      if (pid !== this.id) return;
      this.cx = mx; this.cy = my;
      if (!this.drag) return;
      const input = DC.Input;
      const dx = mx - this.ox, dy = my - this.oy;
      this.moved = Math.max(this.moved, Math.hypot(dx, dy));
      // The drag is a joystick: it walks from where the finger landed. It does
      // not swing. Attacking is the ATTACK button or a tap, so walking past a
      // demon no longer spends every bolt you own on the way to the door.
      if (this.moved < DEAD) { input.touchX = 0; input.touchY = 0; }
      else {
        const len = Math.hypot(dx, dy) || 1;
        input.touchX = dx / len;
        input.touchY = dy / len;
      }
      // ...and one-handed the fingertip is the reticle too: the aim is the line
      // from the body to the finger, so the crosshair on the glass is exactly
      // where the blow or the bolt goes. With the aim stick out there this
      // finger is a joystick only, and the aim belongs to the other thumb.
      if (!this.stick.active) this.aimAt(mx, my);
    },

    up: function (mx, my, id, game) {
      this.lastTouch = nowMs();
      const pid = id === undefined ? (this.id !== null ? this.id : this.attackId) : id;
      if (this.attackId !== null && pid === this.attackId) { this.endAttack(); return; }
      // A button finger lifting has nothing to undo; the walk belongs to the
      // field finger and the swing to the button finger, never to both.
      if (this.id === null || pid !== this.id) return;

      const wasDrag = this.drag;
      const dur = game.time - this.t0;
      const far = this.moved >= DEAD;
      const input = DC.Input;
      this.id = null; this.active = false; this.drag = false;
      input.touchX = 0; input.touchY = 0; input.aimHold = false;
      // The walk ends with this finger. If the other thumb is still holding
      // ATTACK, its swing carries on.

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

    /* The ATTACK finger lifting. The walk, if the other thumb owns one, is
       left alone. */
    endAttack: function () {
      const wasAttack = this.attack;
      const wasStick = this.stick.active;
      this.attack = false;
      this.attackId = null;
      this.endStick();
      if (!wasAttack) return;
      // A press that never reached a simulation step could not have swung, so
      // hand it one swing rather than swallowing the tap.
      if (DC.Input.polls === this.pollAtDown) { DC.Input.tapFrames = 4; DC.Input.firing = true; return; }
      if (!DC.Input.dragging) DC.Input.firing = false;
      // The direction the stick left behind is kept: a phone has no cursor to
      // hand the aim back to, and the last way you pointed is the way you meant.
      if (wasStick && this.id === null) DC.Input.aimHold = false;
    },

    /* Everything down: a cancel, a blur, or a screen change. */
    release: function () {
      const input = DC.Input;
      this.id = null; this.active = false; this.drag = false;
      this.attack = false; this.attackId = null;
      this.endStick();
      input.touchX = 0; input.touchY = 0; input.aimHold = false;
      if (!input.dragging) input.firing = false;
    },

    act: function (b, game) {
      const p = game.player;
      if (b.id === 'ability') DC.Player.ability(game.world, p, game);
      else if (b.id === 'heal') DC.Player.drink(game.world, p, 'heal', game);
      else if (b.id === 'mana') DC.Player.drink(game.world, p, 'mana', game);
      else if (b.id === 'pack') game.openPack();
      else if (b.id === 'pause') game.setState('pause');
      else if (b.id === 'interact') game.tryInteract();
      DC.Audio.play('uiSelect');
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
