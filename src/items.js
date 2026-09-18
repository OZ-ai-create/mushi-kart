import * as THREE from "three";
import { Track } from "./track.js";
import { getCourse } from "./courses.js";
import { std } from "./gfx.js";

export const ITEM_DEFS = [
  { id: "honey", name: "ハチミツ", icon: "🍯", weight: 3 },
  { id: "acorn", name: "どんぐり", icon: "🌰", weight: 3 },
  { id: "homing", name: "てんとう虫ミサイル", icon: "🐞", weight: 2 },
  { id: "silk", name: "クモの糸", icon: "🕸️", weight: 2 },
  { id: "leaf", name: "はっぱ", icon: "🍃", weight: 2 },
  { id: "gust", name: "かぜ", icon: "💨", weight: 1 },
  { id: "electric", name: "でんき", icon: "⚡", weight: 2 },
  { id: "mushroom", name: "きのこ", icon: "🍄", weight: 2 },
  { id: "ants", name: "アリの大群", icon: "🐜", weight: 2 },
];

export function rollItem(place) {
  const bag = [];
  for (const it of ITEM_DEFS) {
    let w = it.weight;
    if (place === 1 && it.id === "gust") w = 0;
    if (place >= 3 && it.id === "honey") w += 2;
    if (place === 1 && it.id === "silk") w += 1;
    if (place === 1 && it.id === "electric") w += 1;
    if (place >= 3 && it.id === "mushroom") w += 1;
    if (place >= 3 && it.id === "homing") w += 2;
    for (let i = 0; i < w; i++) bag.push(it);
  }
  return bag[Math.floor(Math.random() * bag.length)] ?? ITEM_DEFS[0];
}

export function iconOf(id) {
  return ITEM_DEFS.find((i) => i.id === id)?.icon ?? "？";
}

export class ItemWorld {
  constructor(scene) {
    this.scene = scene;
    this.shots = [];
    this.homingShots = [];
    this.traps = [];
    this.rings = [];
    this.ants = [];
    this.slicks = [];
    this.lightning = [];
    this.particles = [];
    this.track = null;
    this.trackId = null;
  }

  use(kart, karts, audio) {
    const id = kart.item;
    kart.item = null;
    if (!id) return;
    audio?.use();
    const flashColor = {
      honey: 0xffd54a, acorn: 0x9b6a3d, homing: 0xff4b4b, silk: 0xeaf6ff,
      leaf: 0x74e36a, gust: 0xbfe8ff, electric: 0xfff06a, mushroom: 0xff6b6b, ants: 0x6b4b3a,
    }[id] ?? 0xffffff;
    this.burst(kart, flashColor);
    if (id === "honey") {
      kart.boost = Math.max(kart.boost, 1.55);
      audio?.boost();
    } else if (id === "acorn") {
      this._acorn(kart);
    } else if (id === "homing") {
      this._homing(kart, karts);
    } else if (id === "silk") {
      this._silk(kart);
    } else if (id === "leaf") {
      kart.shield = 7;
    } else if (id === "gust") {
      this._gust(kart, karts, audio);
    } else if (id === "electric") {
      this._electric(kart, karts, audio);
    } else if (id === "mushroom") {
      this._mushroom(kart, audio);
    } else if (id === "ants") {
      this._ants(kart);
    }
  }

  honeyTrail(kart) {
    for (const back of [1.8, 3.4, 5.0]) {
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(1.15, 20),
        std(0xf4d35e, { transparent: true, opacity: 0.72, side: THREE.DoubleSide, roughness: 0.35, emissive: 0x886600, emissiveIntensity: 0.25 })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.copy(kart.pos);
      mesh.position.x -= Math.sin(kart.yaw) * back;
      mesh.position.z -= Math.cos(kart.yaw) * back;
      mesh.position.y += 0.07;
      this.scene.add(mesh);
      this.slicks.push({ mesh, life: 7.5, owner: kart, hit: new Set() });
    }
    this.burst(kart, 0xffe066);
  }

  burst(kart, color = 0xff9f1c) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.72, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(kart.pos);
    ring.position.y += 0.22;
    this.scene.add(ring);
    this.rings.push({ mesh: ring, life: 0.55, maxLife: 0.55, grow: 20 });

    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.9, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.copy(kart.pos);
    ring2.position.y += 0.3;
    this.scene.add(ring2);
    this.rings.push({ mesh: ring2, life: 0.3, maxLife: 0.3, grow: 30 });

    for (let i = 0; i < 18; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.055 + Math.random() * 0.06, 6, 5),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
      );
      const a = (i / 18) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 3.5 + Math.random() * 6.5;
      mesh.position.set(kart.pos.x, kart.pos.y + 0.35 + Math.random() * 0.7, kart.pos.z);
      this.scene.add(mesh);
      this.particles.push({
        mesh, life: 0.65 + Math.random() * 0.3,
        vel: new THREE.Vector3(Math.cos(a) * speed, 2.2 + Math.random() * 4.5, Math.sin(a) * speed)
      });
    }
  }

  _acorn(kart) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 14),
      std(0x8b5a2b, { roughness: 0.62 })
    );
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 10),
      std(0x5c4030, { roughness: 0.75 })
    );
    cap.position.y = 0.16;
    mesh.add(cap);
    mesh.position.copy(kart.pos);
    mesh.position.y += 0.5;
    this.scene.add(mesh);
    this.shots.push({
      mesh,
      owner: kart,
      vel: new THREE.Vector3(Math.sin(kart.yaw) * 38, 0, Math.cos(kart.yaw) * 38),
      life: 2.4,
      wallCooldown: 0,
    });
  }

  _homing(kart, karts) {
    let target = null;
    let bestGap = Infinity;
    let bestDistance = Infinity;
    for (const other of karts) {
      if (other === kart || other.finished) continue;
      const gap = other.progress - kart.progress;
      const distance = other.pos.distanceTo(kart.pos);
      if (gap > 0.005 && gap < bestGap) {
        target = other;
        bestGap = gap;
        bestDistance = distance;
      } else if (bestGap === Infinity && distance < bestDistance) {
        target = other;
        bestDistance = distance;
      }
    }

    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 12, 10),
      new THREE.MeshLambertMaterial({ color: 0xd93b32 })
    );
    const spot = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xf4e6a8 })
    );
    spot.position.set(0.2, 0.18, 0.24);
    body.add(spot);
    body.position.copy(kart.pos);
    body.position.y += 0.55;
    this.scene.add(body);

    const vel = new THREE.Vector3(Math.sin(kart.yaw) * 42, 0, Math.cos(kart.yaw) * 42);
    this.homingShots.push({
      mesh: body,
      owner: kart,
      target,
      vel,
      speed: 42,
      maxSpeed: 48,
      life: 4.8,
      wallCooldown: 0,
    });
  }

  _silk(kart) {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.9, 24),
      std(0xeaf6ff, { transparent: true, opacity: 0.8, side: THREE.DoubleSide, roughness: 0.3 })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(kart.pos);
    mesh.position.x -= Math.sin(kart.yaw) * 2.2;
    mesh.position.z -= Math.cos(kart.yaw) * 2.2;
    mesh.position.y += 0.06;
    this.scene.add(mesh);
    this.traps.push({ mesh, life: 14, owner: kart });
  }

  _gust(kart, karts, audio) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.7, 32),
      new THREE.MeshBasicMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(kart.pos);
    ring.position.y += 0.2;
    this.scene.add(ring);
    this.rings.push({ mesh: ring, life: 0.55 });
    for (const other of karts) {
      if (other === kart) continue;
      if (other.pos.distanceTo(kart.pos) < 11) hitKart(other, audio);
    }
  }

  _electric(kart, karts, audio) {
    let target = null;
    for (const other of karts) {
      if (other === kart || other.finished) continue;
      if (!target || other.progress > target.progress) target = other;
    }

    if (!target) return;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.72, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff06a, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(target.pos);
    ring.position.y += 0.25;
    this.scene.add(ring);
    this.rings.push({ mesh: ring, life: 0.7 });

    // A short jagged lightning bolt makes the strike immediately readable.
    const points = [];
    const startY = target.pos.y + 8.5;
    const endY = target.pos.y + 0.35;
    const steps = 7;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push(new THREE.Vector3(
        target.pos.x + (i === 0 || i === steps ? 0 : (Math.random() - 0.5) * 1.2),
        startY + (endY - startY) * t,
        target.pos.z + (i === 0 || i === steps ? 0 : (Math.random() - 0.5) * 1.2)
      ));
    }
    const bolt = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0xfff06a, transparent: true, opacity: 0.95 })
    );
    this.scene.add(bolt);
    this.lightning.push({ mesh: bolt, life: 0.28 });

    if (target.shield > 0) {
      target.shield = 0;
      return;
    }
    target.stun = Math.max(target.stun, 1.2);
    target.speed *= 0.25;
    target.hitFlash = 0.9;
    target.boost = 0;
    audio?.hit();
    if (target.isPlayer && navigator.vibrate) navigator.vibrate([25, 35, 25]);
  }

  _mushroom(kart, audio) {
    kart.boost = Math.max(kart.boost, 2.5);
    audio?.boost();
  }

  _ants(kart) {
    const forward = new THREE.Vector3(Math.sin(kart.yaw), 0, Math.cos(kart.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 7, 5),
        new THREE.MeshLambertMaterial({ color: 0x2a211c })
      );
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 7, 5),
        new THREE.MeshLambertMaterial({ color: 0x171310 })
      );
      head.position.z = 0.16;
      mesh.add(body, head);
      const laneOffset = (i - 2) * 0.48;
      const forwardOffset = 2.8 + (i % 2) * 0.7;
      mesh.position.copy(kart.pos).addScaledVector(forward, forwardOffset).addScaledVector(right, laneOffset);
      mesh.position.y = kart.pos.y + 0.18;
      this.scene.add(mesh);
      this.ants.push({ mesh, life: 6, owner: kart, drift: (i - 2) * 0.08 });
    }
  }

  _resolveTrack(track) {
    if (track) return track;

    const fogHex = this.scene.fog?.color?.getHex?.() ?? getCourse("garden").fog;
    const courses = ["garden", "sea", "volcano"];
    let courseId = "garden";
    for (const id of courses) {
      if (getCourse(id).fog === fogHex) {
        courseId = id;
        break;
      }
    }

    if (!this.track || this.trackId !== courseId) {
      this.track = new Track(courseId);
      this.trackId = courseId;
    }
    return this.track;
  }

  _updateShotPhysics(s, dt, track) {
    s.life -= dt;
    s.wallCooldown = Math.max(0, s.wallCooldown - dt);

    const hit = track.project(s.mesh.position);
    const halfWidth = track.halfWidthAt(hit.t);
    const wallMargin = 0.08;
    if (Math.abs(hit.lateral) > halfWidth - wallMargin && s.wallCooldown <= 0) {
      const side = hit.lateral >= 0 ? 1 : -1;
      const normal = hit.binormal.clone().multiplyScalar(side);
      const outwardSpeed = normal.dot(s.vel);
      if (outwardSpeed > 0) {
        s.vel.addScaledVector(normal, -2 * outwardSpeed);
        s.mesh.position.x = hit.point.x + hit.binormal.x * (halfWidth - wallMargin) * side;
        s.mesh.position.z = hit.point.z + hit.binormal.z * (halfWidth - wallMargin) * side;
        s.wallCooldown = 0.08;
      }
    }

    s.vel.y = 0;
    s.mesh.position.y = hit.point.y + 0.5;
    s.mesh.position.addScaledVector(s.vel, dt);
    s.mesh.rotation.x += dt * 10;
    s.mesh.rotation.z += dt * 7;
  }

  update(dt, karts, audio, track = null) {
    track = this._resolveTrack(track);

    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      this._updateShotPhysics(s, dt, track);

      let dead = s.life <= 0;
      for (const k of karts) {
        if (k === s.owner || k.finished) continue;
        if (k.pos.distanceTo(s.mesh.position) < 1.15) {
          hitKart(k, audio);
          dead = true;
          break;
        }
      }
      if (dead) {
        this.scene.remove(s.mesh);
        this.shots.splice(i, 1);
      }
    }

    for (let i = this.homingShots.length - 1; i >= 0; i--) {
      const s = this.homingShots[i];
      s.life -= dt;
      s.wallCooldown = Math.max(0, s.wallCooldown - dt);
      const target = s.target && !s.target.finished ? s.target : null;

      if (target) {
        const desired = new THREE.Vector3(
          target.pos.x - s.mesh.position.x,
          0,
          target.pos.z - s.mesh.position.z
        );
        if (desired.lengthSq() > 0.01) {
          desired.normalize();
          const current = s.vel.clone().setY(0).normalize();
          const turn = Math.min(1, 12 * dt);
          current.lerp(desired, turn).normalize();
          s.speed = Math.min(s.maxSpeed, s.speed + 10 * dt);
          s.vel.set(current.x * s.speed, 0, current.z * s.speed);
        }
      }

      this._updateShotPhysics(s, dt, track);
      let dead = s.life <= 0;
      for (const k of karts) {
        if (k === s.owner || k.finished) continue;
        if (k.pos.distanceTo(s.mesh.position) < 1.35) {
          hitKart(k, audio);
          dead = true;
          break;
        }
      }
      if (dead) {
        this.scene.remove(s.mesh);
        this.homingShots.splice(i, 1);
      }
    }

    for (let i = this.traps.length - 1; i >= 0; i--) {
      const tr = this.traps[i];
      tr.life -= dt;
      tr.mesh.rotation.z += dt * 1.2;
      let dead = tr.life <= 0;
      for (const k of karts) {
        if (k === tr.owner || k.finished) continue;
        const dx = k.pos.x - tr.mesh.position.x;
        const dz = k.pos.z - tr.mesh.position.z;
        if (dx * dx + dz * dz < 1.15) {
          if (k.shield > 0) k.shield = 0;
          else {
            k.speed *= 0.2;
            k.stun = Math.max(k.stun, 0.7);
          }
          dead = true;
          audio?.hit();
          break;
        }
      }
      if (dead) {
        this.scene.remove(tr.mesh);
        this.traps.splice(i, 1);
      }
    }

    for (let i = this.ants.length - 1; i >= 0; i--) {
      const ant = this.ants[i];
      ant.life -= dt;
      ant.mesh.position.y += Math.sin((6 - ant.life) * 8 + ant.drift * 10) * dt * 0.03;
      ant.mesh.position.x += Math.sin((6 - ant.life) * 1.5 + ant.drift) * dt * ant.drift;
      ant.mesh.position.z += Math.cos((6 - ant.life) * 1.3 + ant.drift) * dt * ant.drift;
      let dead = ant.life <= 0;
      for (const k of karts) {
        if (k === ant.owner || k.finished) continue;
        if (k.pos.distanceTo(ant.mesh.position) < 1.0) {
          if (k.shield > 0) k.shield = 0;
          else {
            k.speed *= 0.38;
            k.stun = Math.max(k.stun, 0.55);
            k.hitFlash = 0.45;
            k.boost = 0;
          }
          dead = true;
          break;
        }
      }
      if (dead) {
        this.scene.remove(ant.mesh);
        this.ants.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vel.y -= 8.5 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.multiplyScalar(Math.max(0.82, 1 - dt * 1.8));
      p.mesh.material.opacity = Math.max(0, p.life / 0.9);
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry?.dispose?.();
        p.mesh.material?.dispose?.();
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.lightning.length - 1; i >= 0; i--) {
      const bolt = this.lightning[i];
      bolt.life -= dt;
      bolt.mesh.material.opacity = Math.max(0, bolt.life / 0.28);
      if (bolt.life <= 0) {
        this.scene.remove(bolt.mesh);
        bolt.mesh.geometry?.dispose?.();
        bolt.mesh.material?.dispose?.();
        this.lightning.splice(i, 1);
      }
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      r.mesh.scale.addScalar(dt * (r.grow ?? 18));
      r.mesh.material.opacity = Math.max(0, r.life * 1.6);
      if (r.life <= 0) {
        this.scene.remove(r.mesh);
        this.rings.splice(i, 1);
      }
    }

    for (let i = this.slicks.length - 1; i >= 0; i--) {
      const sl = this.slicks[i];
      sl.life -= dt;
      sl.mesh.rotation.z += dt * 0.6;
      sl.mesh.material.opacity = Math.max(0.12, Math.min(0.72, sl.life / 7.5));
      for (const k of karts) {
        if (k === sl.owner || k.finished || sl.hit.has(k)) continue;
        if (k.ghostT > 0 || k.ramT > 0 || k.leapT > 0) continue;
        const dx = k.pos.x - sl.mesh.position.x;
        const dz = k.pos.z - sl.mesh.position.z;
        if (dx * dx + dz * dz < 1.45) {
          sl.hit.add(k);
          k.speed *= 0.42;
          k.boost = 0;
          audio?.hit();
        }
      }
      if (sl.life <= 0) {
        this.scene.remove(sl.mesh);
        this.slicks.splice(i, 1);
      }
    }
  }

  dispose() {
    for (const s of this.shots) this.scene.remove(s.mesh);
    for (const s of this.homingShots) this.scene.remove(s.mesh);
    for (const t of this.traps) this.scene.remove(t.mesh);
    for (const r of this.rings) this.scene.remove(r.mesh);
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry?.dispose?.();
      p.mesh.material?.dispose?.();
    }
    for (const l of this.lightning) {
      this.scene.remove(l.mesh);
      l.mesh.geometry?.dispose?.();
      l.mesh.material?.dispose?.();
    }
    for (const a of this.ants) this.scene.remove(a.mesh);
    for (const s of this.slicks) this.scene.remove(s.mesh);
    this.shots.length = 0;
    this.homingShots.length = 0;
    this.traps.length = 0;
    this.rings.length = 0;
    this.lightning.length = 0;
    this.particles.length = 0;
    this.ants.length = 0;
    this.slicks.length = 0;
    this.track = null;
    this.trackId = null;
  }
}

export function hitKart(kart, audio) {
  if (kart.ramT > 0 || kart.ghostT > 0 || kart.leapT > 0) return;
  if (kart.shield > 0) {
    kart.shield = 0;
    return;
  }
  kart.stun = 1.15;
  kart.speed *= 0.15;
  kart.hitFlash = 0.7;
  kart.boost = 0;
  audio?.hit();
  if (kart.isPlayer && navigator.vibrate) navigator.vibrate(35);
}
