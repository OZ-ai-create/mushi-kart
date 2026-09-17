import * as THREE from "three";

function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Acceleration is expressed as "how quickly this kart reaches its current cap".
// Higher accel stat => shorter time from 0 to top speed.
const ACCEL_TIME_REFERENCE = 30;

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
    this.wantsBoostSfx = false;
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
    this.lastPos = new THREE.Vector3();
    this._pitch = 0;
    this.specialUsed = false;
    this.ramT = 0;
    this.ghostT = 0;
    this.luckyT = 0;
    this.leapT = 0;
    this.leapMax = 0;
    this._ramHit = null;
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
    if (this.hitFlash > 0) this.hitFlash -= dt;
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
      }
    }
    if (this.hop > 0) this.hop -= dt * (this.leapT > 0 ? 0.9 : 3.6);

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
        this.hop = 1;
      }
      this.driftHold += dt;
      steer = this.driftDir * 0.28 + steer * 0.22;
      if (!this.driftTurboGiven && this.driftHold >= 3 && this.speed > 7) {
        this.driftTurboGiven = true;
        this.boost = Math.max(this.boost, 1.5);
        this.wantsBoostSfx = true;
      }
    } else if (this.drifting) {
      if (!this.driftTurboGiven && this.driftHold >= 3 && this.speed > 7 && !this.finished) {
        this.boost = Math.max(this.boost, 1.5);
        this.wantsBoostSfx = true;
      } else if (!this.driftTurboGiven && this.driftHold > 0.5 && this.speed > 7 && !this.finished) {
        this.boost = Math.max(this.boost, 0.55);
      }
      this.drifting = false;
      this.driftHold = 0;
      this.driftTurboGiven = false;
    }

    const boosting = this.boost > 0;
    const cap =
      this.stats.maxSpeed *
      this.speedMul *
      (this.offroad ? this.stats.offroadMul ?? 0.72 : 1) *
      (boosting ? 1.36 : 1) *
      (this.finished ? 0.35 : 1);
    const slopeStep = 5 / Math.max(12, track.length);
    const slope = (track.at(this.t + slopeStep).point.y - track.at(this.t).point.y) / 5;
    const hillMul = slope > 0.14 ? 0.86 : slope < -0.12 ? 1.1 : 1;

    if (!this.finished) {
      if (input.brake) {
        this.speed -= 34 * dt;
      } else {
        // Convert the acceleration stat into a target time-to-top-speed.
        // This makes the stat relationship explicit: larger accel = less time.
        const accelTime = ACCEL_TIME_REFERENCE / Math.max(1, this.stats.accel);
        const accelRate = cap / accelTime;
        this.speed += accelRate * (boosting ? 1.35 : 1) * dt;
      }
      this.speed += -slope * 28 * dt;
    } else {
      this.speed -= 18 * dt;
    }
    this.speed = THREE.MathUtils.clamp(this.speed, input.brake ? -7 : 0, cap * hillMul);

    const grip = THREE.MathUtils.clamp(Math.abs(this.speed) / 10, 0.18, 1);
    const rate = this.stats.handling * (this.drifting ? 1.12 : 1.82) * (this.luckyT > 0 ? 1.72 : 1);
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
      const lock = this.drifting ? 0.22 : 1;
      const assist = handsOff * (this.offroad ? 5.2 : 2.7) * (this.drifting ? 0.4 : 1);
      this.yaw += align * Math.min(1, assist * dt);
      lat += -lat * dt * 1.6 * handsOff * lock;
    } else {
      this.yaw = trackYaw;
      const laneMax = Math.max(0.55, hw - 1.15);
      const lane = THREE.MathUtils.clamp(this.aiOffset, -laneMax, laneMax);
      lat += (lane - lat) * Math.min(1, 5.5 * dt);
    }

    if (this.luckyT > 0) lat += -lat * Math.min(1, 5.2 * dt);

    const wall = hw + 0.28;
    if (Math.abs(lat) > wall) {
      lat = Math.sign(lat) * wall;
      this.yaw = trackYaw;
      // Wall contact is now a meaningful mistake: lose speed and suffer a
      // short stun instead of simply being nudged back onto the track.
      this.speed *= 0.55;
      this.stun = Math.max(this.stun, 0.32);
      this.hitFlash = Math.max(this.hitFlash, 0.2);
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
    const roll = -this.steerVis * 0.16 - (this.drifting ? this.driftDir * 0.2 : 0);
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
  kart.aiOffset = THREE.MathUtils.damp(kart.aiOffset, THREE.MathUtils.clamp(offset, -laneMax, laneMax), 3.5, 0.016);
  const laneErr = kart.lateral - kart.aiOffset;
  const steer = THREE.MathUtils.clamp(laneErr * 0.25, -0.45, 0.45);
  const drift = Math.abs(laneErr) > 1.6 && kart.speed > 14;
  return { steer, drift, brake: false };
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
  a.speed -= rel * 0.12 * b.stats.weight;
  b.speed += rel * 0.12 * a.stats.weight;
}
