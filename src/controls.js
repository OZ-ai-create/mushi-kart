export class Input {
  constructor() {
    this.steer = 0;
    this.drift = false;
    this.brake = false;
    this.gyroOn = false;
    this._itemQueued = false;
    this._specialQueued = false;
    this._touchSteer = 0;
    this._gyroSteer = 0;
    this._orientDeg = null;
    this._motionDeg = null;
    this._gyroZero = null;
    this._originX = 0;
    this._steering = false;
    this._steerId = null;
    this._onOrientBound = (e) => this._onOrient(e);
    this._onMotionBound = (e) => this._onMotion(e);
  }

  _bindSensors() {
    window.removeEventListener("deviceorientation", this._onOrientBound);
    window.removeEventListener("devicemotion", this._onMotionBound);
    window.removeEventListener("webkitdeviceorientation", this._onOrientBound);
    window.removeEventListener("deviceorientationabsolute", this._onOrientBound);
    window.addEventListener("deviceorientation", this._onOrientBound);
    window.addEventListener("devicemotion", this._onMotionBound);
    window.addEventListener("webkitdeviceorientation", this._onOrientBound);
    window.addEventListener("deviceorientationabsolute", this._onOrientBound);
  }

  attach({ steerZone, knob, driftBtn, itemBtn, brakeBtn, specialBtn }) {
    this.knob = knob;

    const setHeld = (btn, on) => btn.classList.toggle("held", on);

    steerZone.addEventListener("pointerdown", (e) => {
      if (this._steering) return;
      this._steering = true;
      this._steerId = e.pointerId;
      this._originX = e.clientX;
      try {
        steerZone.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      this._applySteer(e.clientX);
    });
    steerZone.addEventListener("pointermove", (e) => {
      if (!this._steering || e.pointerId !== this._steerId) return;
      this._applySteer(e.clientX);
    });
    const endSteer = (e) => {
      if (e.pointerId !== this._steerId) return;
      this._steering = false;
      this._steerId = null;
      this._touchSteer = 0;
      this._syncKnob();
    };
    steerZone.addEventListener("pointerup", endSteer);
    steerZone.addEventListener("pointercancel", endSteer);

    const hold = (btn, key, onDown, onUp) => {
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        onDown();
        setHeld(btn, true);
        try {
          btn.setPointerCapture(e.pointerId);
        } catch {
          /* synthetic events in tests / some WebViews */
        }
      });
      const up = () => {
        onUp();
        setHeld(btn, false);
      };
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointercancel", up);
    };

    hold(
      driftBtn,
      "drift",
      () => {
        this.drift = true;
      },
      () => {
        this.drift = false;
      }
    );
    hold(
      brakeBtn,
      "brake",
      () => {
        this.brake = true;
      },
      () => {
        this.brake = false;
      }
    );
    itemBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this._itemQueued = true;
      setHeld(itemBtn, true);
    });
    itemBtn.addEventListener("pointerup", () => setHeld(itemBtn, false));
    itemBtn.addEventListener("pointercancel", () => setHeld(itemBtn, false));

    if (specialBtn) {
      specialBtn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this._specialQueued = true;
        setHeld(specialBtn, true);
      });
      specialBtn.addEventListener("pointerup", () => setHeld(specialBtn, false));
      specialBtn.addEventListener("pointercancel", () => setHeld(specialBtn, false));
    }

    this._keys = { left: false, right: false };
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") this._keys = { ...this._keys, left: true };
      if (e.code === "ArrowRight" || e.code === "KeyD") this._keys = { ...this._keys, right: true };
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.drift = true;
      if (e.code === "ArrowDown" || e.code === "KeyS") this.brake = true;
      if (e.code === "Space") {
        e.preventDefault();
        this._itemQueued = true;
      }
      if (e.code === "KeyE") {
        e.preventDefault();
        this._specialQueued = true;
      }
    });
    window.addEventListener("keyup", (e) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") this._keys = { ...this._keys, left: false };
      if (e.code === "ArrowRight" || e.code === "KeyD") this._keys = { ...this._keys, right: false };
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") this.drift = false;
      if (e.code === "ArrowDown" || e.code === "KeyS") this.brake = false;
    });
    this._keys = { left: false, right: false };
    this._bindSensors();
    document.addEventListener("visibilitychange", () => {
      if (this.gyroOn && document.visibilityState === "visible") this._bindSensors();
    });
  }

  _applySteer(x) {
    this._touchSteer = Math.max(-1, Math.min(1, (x - this._originX) / 72));
    this._syncKnob();
  }

  _wrapTilt(deg) {
    while (deg > 90) deg -= 180;
    while (deg < -90) deg += 180;
    return deg;
  }

  _degFromGravity(g) {
    const x = g.x ?? 0;
    const y = g.y ?? 0;
    const z = g.z ?? 0;
    const mag = Math.hypot(x, y, z);
    if (mag < 0.35) return null;
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    const az = Math.abs(z);
    const toDeg = (rad) => this._wrapTilt((rad * 180) / Math.PI);
    if (az > ax && az > ay) return toDeg(Math.atan2(x, y || 0.0001));
    if (ax > ay) return toDeg(Math.atan2(y, x));
    return toDeg(Math.atan2(x, -y));
  }

  _refreshGyro() {
    if (!this.gyroOn) {
      this._gyroSteer = 0;
      return;
    }
    const m = this._motionDeg;
    const o = this._orientDeg;
    let deg = null;
    if (m != null && o != null) deg = Math.abs(o) > Math.abs(m) ? o : m;
    else deg = m != null ? m : o;
    if (deg == null || !Number.isFinite(deg)) return;
    if (this._gyroZero == null) this._gyroZero = deg;
    this._gyroSteer = Math.max(-1, Math.min(1, (deg - this._gyroZero) / 12));
    if (!this._steering) this._syncKnob();
  }

  _onMotion(e) {
    if (!this.gyroOn) return;
    const g = e.accelerationIncludingGravity || e.acceleration;
    if (!g || (g.x == null && g.y == null)) return;
    this._motionDeg = this._degFromGravity(g);
    this._refreshGyro();
  }

  _onOrient(e) {
    if (!this.gyroOn) return;
    const landscape = window.innerWidth > window.innerHeight;
    const gamma = e.gamma;
    const beta = e.beta;
    if (landscape) {
      const g = gamma == null ? 0 : Math.abs(gamma);
      const b = beta == null ? 0 : Math.abs(beta);
      this._orientDeg = b > g ? beta : gamma;
    } else {
      this._orientDeg = gamma;
    }
    if (this._orientDeg != null) this._orientDeg = this._wrapTilt(this._orientDeg);
    this._refreshGyro();
  }

  _syncKnob() {
    if (!this.knob) return;
    const v = this._steering ? this._touchSteer : this._gyroSteer;
    this.knob.style.transform = `translate(calc(-50% + ${v * 48}px), -50%)`;
  }

  sample() {
    let keySteer = 0;
    if (this._keys.left) keySteer -= 1;
    if (this._keys.right) keySteer += 1;
    this.steer = Math.max(-1, Math.min(1, this._touchSteer + this._gyroSteer + keySteer));
    return {
      steer: this.steer,
      drift: this.drift,
      brake: this.brake,
    };
  }

  consumeItem() {
    if (!this._itemQueued) return false;
    this._itemQueued = false;
    return true;
  }

  consumeSpecial() {
    if (!this._specialQueued) return false;
    this._specialQueued = false;
    return true;
  }

  async enableGyro(on) {
    this.gyroOn = on;
    if (!on) {
      this._gyroSteer = 0;
      this._orientDeg = null;
      this._motionDeg = null;
      this._gyroZero = null;
      return true;
    }
    if (!window.isSecureContext) {
      this.gyroOn = false;
      return false;
    }
    this._gyroZero = null;
    let granted = false;
    const ask = async (Ctor) => {
      if (typeof Ctor === "undefined" || !Ctor.requestPermission) return true;
      try {
        return (await Ctor.requestPermission()) === "granted";
      } catch {
        return false;
      }
    };
    const motionOk = await ask(typeof DeviceMotionEvent !== "undefined" ? DeviceMotionEvent : undefined);
    const orientOk = await ask(typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : undefined);
    granted = motionOk || orientOk;
    if (
      !(typeof DeviceMotionEvent !== "undefined" && DeviceMotionEvent.requestPermission) &&
      !(typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission)
    ) {
      granted = true;
    }
    if (!granted) {
      this.gyroOn = false;
      return false;
    }
    this._bindSensors();
    return true;
  }
}
