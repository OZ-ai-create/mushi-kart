import * as THREE from "three";

function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Acceleration is expressed as "how quickly this kart reaches its current cap".
// Higher accel stat => shorter time from 0 to top speed.
const ACCEL_TIME_REFERENCE = 22;

export class Kart {
  constructor({ stats, mesh, isPlayer, name }) {
    this.stats = stats;
    this.mesh = mesh;
    this.isPlayer = isPlayer;
    this.name = name;
    this.pos = new THREE.Vector3();
    this.yaw = 0;
    this.speed = 0;
    this.steerVis = 0;
    this.boost = 0;
    this.stun = 0;
    this.shield = 0;
    this.drifting = false;
    this.driftDir = 0;
    this.driftHold = 0;
    this.driftTurboGiven = false;
    this.driftBoostLevel = 0;
    this.driftStage = 0;
    this.wantsBoostSfx = false;
    this.boostBurst = false;
    this.justLanded = false;
    this.hop = 0;
    this.offroad = false;
    this.t = 0;
    this.lateral = 0;
    this.lap = 0;
    this.progress = 0;
    this.finished = false;
    this.finishTime = 0;
    this.place = 1;
    this.item = null;
    this.roulette = 0;
    this.rouletteShow = null;
    this.aiOffset = (Math.random() - 0.5) * 2.2;
    this.aiTimer = 0;
    this.speedMul = 1;
    this._lastT = 0;
    this._passedMid = false;
    this.hitFlash = 0;
    this.hitCooldown = 0;
    this.lastPos = new THREE.Vector3();
    this._pitch = 0;
    this.specialUsed = false;
    this.ramT = 0;
    this.ghostT = 0;
    this.luckyT = 0;
    this.leapT = 0;
    this.leapMax = 0;
    this._ramHit = null;
    this._walled = false;
  }

  spawn(track, t, lateral) {
    const f = track.at(t);
    this.t = t;
    this._lastT = t;
    this.lateral = lateral;
    this.pos.copy(f.point).addScaledVector(f.binormal, lateral).addScaledVector(f.normal, 0.28);
    this.lastPos.copy(this.pos);
    this.yaw = Math.atan2(f.tangent.x, f.tangent.z);
    this.speed = 0;
    this.lap = 0;
    this.finished = false;
    this.drifting = false;
    this.driftHold = 0;
    this.driftTurboGiven = false;
    this.driftBoostLevel = 0;
    this.driftStage = 0;
    this.boostBurst = false;
    this.justLanded = false;
    this._walled = false;
    this.item = null;
    this.roulette = 0;
    this._pitch = 0;
    this.specialUsed = false;
    this.ramT = 0;
    this.ghostT = 0;
    this.luckyT = 0;
    this.leapT = 0;
    this.leapMax = 0;
    this._ramHit = null;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.set(0, this.yaw, 0);
  }

  _giveTurbo(amount) {
    this.driftTurboGiven = true;
    this.boost = Math.max(this.boost, amount);
    this.speed = Math.max(this.speed + 2.2 + amount * 1.8, this.stats.maxSpeed * 0.92);
    this.hop = Math.max(this.hop, 0.18);
    this.wantsBoostSfx = true;
    this.boostBurst = true;
  }

  snapToTrack(track, fromWorld = false) {
    if (fromWorld) {
      const near = track.project(this.pos, this.t);
      this.t = near.t;
      this.lateral = near.lateral;
    }
    const f = track.at(this.t);
    const wall = track.halfWidthAt(this.t) + 0.28;
    this.lateral = THREE.MathUtils.clamp(this.lateral, -wall, wall);
    const hopY = Math.sin(Math.max(0, this.hop) * Math.PI) * (this.leapT > 0 ? 2.35 : 0.5);
    this.pos.copy(f.point).addScaledVector(f.binormal, this.lateral);
    this.pos.y = f.point.y + 0.08 + hopY;
  }

  update(dt, input, track) {
    this.lastPos.copy(this.pos);
    this.wantsBoostSfx = false;
    this.justLanded = false;
    const hopBefore = this.hop;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.hitCooldown > 0) this.hitCooldown -= dt;
    if (this.shield > 0) this.shield -= dt;
    if (this.boost > 0) this.boost -= dt;
    if (this.ramT > 0) this.ramT -= dt;
    if (this.ghostT > 0) this.ghostT -= dt;
    if (this.luckyT > 0) this.luckyT -= dt;
    if (this.leapT > 0) {
      this.leapT -= dt;
      this.hop = Math.max(this.hop, this.leapT / Math.max(0.01, this.leapMax));
      if (this.leapT <= 0) {
        this.boost = Math.max(this.boost, 0.9);
        this.wantsBoostSfx = true;
        this.boostBurst = true;
      }
    }
    if (this.hop > 0) this.hop -= dt * (this.leapT > 0 ? 0.9 : 3.6);
    if (hopBefore > 0 && this.hop <= 0) this.justLanded = true;

    if (this.roulette > 0) {
      this.roulette -= dt;
      if (this.roulette <= 0) this.rouletteShow = null;
    }

    if (this.stun > 0 && this.ramT <= 0) {
      this.stun -= dt;
      this.speed *= Math.pow(0.08, dt);
      input = { steer: Math.sin(this.stun * 18) * 0.35, drift: false, brake: false };
    } else if (this.stun > 0) {
      this.stun -= dt;
    }

    let steer = input.steer;
    const keepDrift = this.drifting && input.drift && !this.finished && this.speed > 6;
    const startDrift = !this.finished && this.speed > 9 && input.drift && Math.abs(steer) > 0.12;
    if (keepDrift || startDrift) {
      if (!this.drifting) {
        this.drifting = true;
        this.driftDir = Math.sign(steer) || this.driftDir || 1;
        this.driftHold = 0;
        this.driftTurboGiven = false;
        this.driftBoostLevel = 0;
        this.hop = 0.78;
      }
      this.driftHold += dt * (this.stats.driftBonus || 1);
      this.driftStage = this.driftHold >= 2.2 ? 3 : this.driftHold >= 1.1 ? 2 : this.driftHold >= 0.45 ? 1 : 0;
      this.driftBoostLevel = this.driftStage;
      const inward = THREE.MathUtils.clamp(steer * this.driftDir, -1, 1);
      steer = this.driftDir * (0.46 + Math.max(0, inward) * 0.4) + Math.min(0, inward) * 0.14 * this.driftDir;
    } else if (this.drifting) {
      if (!this.driftTurboGiven && this.speed > 7 && !this.finished) {
        if (this.driftStage >= 3) this._giveTurbo(1.95);
        else if (this.driftStage >= 2) this._giveTurbo(1.25);
        else if (this.driftStage >= 1) this._giveTurbo(0.62);
      }
      this.drifting = false;
      this.driftHold = 0;
      this.driftTurboGiven = false;
      this.driftBoostLevel = 0;
      this.driftStage = 0;
    }

    const boosting = this.boost > 0;
    const cap =
      this.stats.maxSpeed *
      this.speedMul *
      (this.offroad ? this.stats.offroadMul ?? 0.72 : 1) *
      (boosting ? 1.48 : 1) *
      (this.drifting ? 1.04 : 1) *
      (this.finished ? 0.35 : 1);
    const slopeStep = 5 / Math.max(12, track.length);
    const slope = (track.at(this.t + slopeStep).point.y - track.at(this.t).point.y) / 5;
    const hillMul = slope > 0.14 ? 0.86 : slope < -0.12 ? 1.1 : 1;

    if (!this.finished) {
      if (input.brake) {
        this.speed -= 34 * dt;
      } else {
        const accelTime = ACCEL_TIME_REFERENCE / Math.max(1, this.stats.accel);
        const accelRate = cap / accelTime;
        this.speed += accelRate * (boosting ? 1.55 : 1) * dt;
      }
      this.speed += -slope * 28 * dt;
    } else {
      this.speed -= 18 * dt;
    }
    this.speed = THREE.MathUtils.clamp(this.speed, input.brake ? -7 : 0, cap * hillMul);

    const airborne = this.hop > 0.12;
    const grip = THREE.MathUtils.clamp(Math.abs(this.speed) / 10, 0.18, 1) * (airborne ? 0.72 : 1);
    const rate = this.stats.handling * (this.drifting ? 1.28 : 1.82) * (this.luckyT > 0 ? 1.72 : 1);
    this.yaw += -steer * rate * grip * dt;
    this.steerVis = THREE.MathUtils.damp(this.steerVis, steer, 12, dt);

    this.pos.x += Math.sin(this.yaw) * this.speed * dt;
    this.pos.z += Math.cos(this.yaw) * this.speed * dt;

    const near = track.project(this.pos, this.t);
    this.t = near.t;
    let lat = near.lateral;
    const hw = track.halfWidthAt(this.t);
    this.offroad = Math.abs(lat) > hw - 0.2;

    const trackYaw = Math.atan2(near.tangent.x, near.tangent.z);
    const align = wrapPi(trackYaw - this.yaw);

    if (this.isPlayer) {
      const handsOff = 1 - Math.min(1, Math.abs(input.steer));
      const lock = this.drifting ? 0.18 : 1;
      const assist = handsOff * (this.offroad ? 3.4 : 1.45) * (this.drifting ? 0.28 : 1);
      this.yaw += align * Math.min(1, assist * dt);
      lat += -lat * dt * 1.15 * handsOff * lock;
    } else {
      const want = trackYaw - (this.drifting ? this.driftDir * 0.38 : 0);
      this.yaw += wrapPi(want - this.yaw) * Math.min(1, 11 * dt);
      const laneMax = Math.max(0.55, hw - 1.15);
      const lane = THREE.MathUtils.clamp(this.aiOffset, -laneMax, laneMax);
      lat += (lane - lat) * Math.min(1, 5.5 * dt);
    }

    if (this.luckyT > 0) lat += -lat * Math.min(1, 5.2 * dt);

    const wall = hw + 0.28;
    if (Math.abs(lat) > wall) {
      const first = !this._walled;
      this._walled = true;
      lat = Math.sign(lat) * wall;
      this.yaw = trackYaw;
      if (first) {
        this.speed *= 0.62;
        this.stun = Math.max(this.stun, 0.16);
        this.hitFlash = Math.max(this.hitFlash, 0.14);
      } else {
        this.speed *= Math.pow(0.42, dt);
      }
    } else {
      this._walled = false;
    }
    this.lateral = lat;
    this.snapToTrack(track);

    if (!this.finished) {
      if (this.t > 0.42 && this.t < 0.72) this._passedMid = true;
      if (this._lastT > 0.8 && this.t < 0.2 && this._passedMid) {
        this.lap += 1;
        this._passedMid = false;
      }
    }
    this._lastT = this.t;
    this.progress = this.lap + this.t;

    this.mesh.position.copy(this.pos);
    this.mesh.rotation.order = "YXZ";
    this.mesh.rotation.y = this.yaw;
    const roll = -this.steerVis * 0.22 - (this.drifting ? this.driftDir * 0.38 : 0);
    this.mesh.rotation.z = roll;
    const ahead = track.at(this.t + 0.01);
    const here = track.at(this.t);
    const horiz = Math.hypot(ahead.point.x - here.point.x, ahead.point.z - here.point.z) || 1e-3;
    const wantPitch = -Math.atan2(ahead.point.y - here.point.y, horiz);
    this._pitch = THREE.MathUtils.damp(this._pitch, wantPitch, 9, dt);
    this.mesh.rotation.x = this._pitch + (this.offroad ? Math.sin(performance.now() * 0.03) * 0.04 : 0);
    this.mesh.userData.update?.(dt, {
      speed: this.speed,
      steer: this.steerVis,
      boost: boosting || this.ramT > 0,
      shield: this.shield > 0 || this.ghostT > 0,
      ram: this.ramT > 0,
      drift: this.drifting,
      driftStage: this.driftStage,
      driftLevel: this.driftBoostLevel,
      offroad: this.offroad,
    });
    if (this.hitFlash > 0) this.mesh.visible = Math.sin(this.hitFlash * 40) > 0;
    else this.mesh.visible = true;
  }
}

export function aiInput(kart, track, rivals = [], obstacles = []) {
  const hw = track.halfWidthAt(kart.t);
  const laneMax = Math.max(0.55, hw - 1.15);
  let offset = kart.aiOffset;
  if (kart.speed > 8) {
    for (const o of rivals) {
      if (o === kart) continue;
      const dp = o.progress - kart.progress;
      if (dp > 0 && dp < 0.04 && Math.abs(o.lateral - kart.lateral) < 1.4) {
        offset += o.lateral >= kart.lateral ? -1.1 : 1.1;
      }
    }
  }
  const speed = Math.max(7, kart.speed);
  for (const o of obstacles) {
    let ahead = o.t - kart.t;
    ahead = ((ahead % 1) + 1) % 1;
    if (ahead > 0.42) continue;
    const dist = ahead * track.length;
    if (dist < 0.45 || dist > 16) continue;
    const eta = dist / speed;
    let elat = o.lat ?? 0;
    if (o.type === "cross") {
      const amp = Math.max(0.85, track.halfWidthAt(o.t) - 1.55);
      elat = Math.sin((o.time + eta) * o.freq) * amp;
    }
    if (Math.abs(elat - kart.lateral) < 2.15) {
      offset += elat >= kart.lateral ? -1.75 : 1.75;
    }
  }
  const a0 = Math.atan2(track.at(kart.t).tangent.x, track.at(kart.t).tangent.z);
  const a1 = Math.atan2(track.at((kart.t + 0.032) % 1).tangent.x, track.at((kart.t + 0.032) % 1).tangent.z);
  const curve = wrapPi(a1 - a0);
  const wantDrift = Math.abs(curve) > 0.11 && kart.speed > 11 && !kart.stun;
  kart.aiOffset = THREE.MathUtils.damp(kart.aiOffset, THREE.MathUtils.clamp(offset, -laneMax, laneMax), 3.5, 0.016);
  const laneErr = kart.lateral - kart.aiOffset;
  const steer = wantDrift
    ? Math.sign(curve || kart.driftDir || 1) * 0.62
    : THREE.MathUtils.clamp(laneErr * 0.25, -0.45, 0.45);
  return { steer, drift: wantDrift, brake: false };
}

export function bumpKarts(a, b) {
  if (a.ramT > 0 || b.ramT > 0 || a.ghostT > 0 || b.ghostT > 0 || a.leapT > 0 || b.leapT > 0) return;
  const dx = a.pos.x - b.pos.x;
  const dz = a.pos.z - b.pos.z;
  const d2 = dx * dx + dz * dz;
  const min = 1.35;
  if (d2 >= min * min || d2 < 1e-6) return;
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const nz = dz / d;
  const overlap = min - d;
  const wa = b.stats.weight / (a.stats.weight + b.stats.weight);
  a.pos.x += nx * overlap * wa;
  a.pos.z += nz * overlap * wa;
  b.pos.x -= nx * overlap * (1 - wa);
  b.pos.z -= nz * overlap * (1 - wa);
  const rel = a.speed - b.speed;
  a.speed -= rel * 0.2 * b.stats.weight;
  b.speed += rel * 0.2 * a.stats.weight;
  if (Math.abs(rel) > 7) {
    const victim = rel > 0 ? b : a;
    if (victim.shield <= 0 && victim.ghostT <= 0) {
      victim.stun = Math.max(victim.stun, 0.2);
      victim.hitFlash = Math.max(victim.hitFlash, 0.18);
    }
  }
}
