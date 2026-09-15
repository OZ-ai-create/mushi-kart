import * as THREE from "three";
import { Track } from "./track.js";
import { getCourse } from "./courses.js";

export const ITEM_DEFS = [
  { id: "honey", name: "ハチミツ", icon: "🍯", weight: 3 },
  { id: "acorn", name: "どんぐり", icon: "🌰", weight: 3 },
  { id: "silk", name: "クモの糸", icon: "🕸️", weight: 2 },
  { id: "leaf", name: "はっぱ", icon: "🍃", weight: 2 },
  { id: "gust", name: "かぜ", icon: "💨", weight: 1 },
];

export function rollItem(place) {
  const bag = [];
  for (const it of ITEM_DEFS) {
    let w = it.weight;
    if (place === 1 && it.id === "gust") w = 0;
    if (place >= 3 && it.id === "honey") w += 2;
    if (place === 1 && it.id === "silk") w += 1;
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
    this.traps = [];
    this.rings = [];
    this.track = null;
    this.trackId = null;
  }

  use(kart, karts, audio) {
    const id = kart.item;
    kart.item = null;
    if (!id) return;
    audio?.use();
    if (id === "honey") {
      kart.boost = Math.max(kart.boost, 1.55);
      audio?.boost();
    } else if (id === "acorn") {
      this._acorn(kart);
    } else if (id === "silk") {
      this._silk(kart);
    } else if (id === "leaf") {
      kart.shield = 7;
    } else if (id === "gust") {
      this._gust(kart, karts, audio);
    }
  }

  _acorn(kart) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0x8b5a2b })
    );
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0x5c4030 })
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

  _silk(kart) {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.9, 10),
      new THREE.MeshLambertMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
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
      new THREE.RingGeometry(0.4, 0.7, 20),
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

  update(dt, karts, audio, track = null) {
    track = this._resolveTrack(track);

    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.life -= dt;
      s.wallCooldown = Math.max(0, s.wallCooldown - dt);

      // Green-shell-like projectiles stay on the track surface and bounce off the walls.
      const hit = track.project(s.mesh.position);
      const halfWidth = track.halfWidthAt(hit.t);
      const wallMargin = 0.08;
      if (Math.abs(hit.lateral) > halfWidth - wallMargin && s.wallCooldown <= 0) {
        const side = hit.lateral >= 0 ? 1 : -1;
        const normal = hit.binormal.clone().multiplyScalar(side);
        const inward = -normal.dot(s.vel);
        if (inward > 0) {
          s.vel.addScaledVector(normal, 2 * inward);
          s.mesh.position.x = hit.point.x + hit.binormal.x * (halfWidth - wallMargin) * side;
          s.mesh.position.z = hit.point.z + hit.binormal.z * (halfWidth - wallMargin) * side;
          s.wallCooldown = 0.08;
        }
      }

      // Keep the projectile on the road instead of letting gravity pull it into the course/ground.
      s.vel.y = 0;
      s.mesh.position.y = hit.point.y + 0.5;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.rotation.x += dt * 10;
      s.mesh.rotation.z += dt * 7;

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

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      r.mesh.scale.addScalar(dt * 18);
      r.mesh.material.opacity = Math.max(0, r.life * 1.6);
      if (r.life <= 0) {
        this.scene.remove(r.mesh);
        this.rings.splice(i, 1);
      }
    }
  }

  dispose() {
    for (const s of this.shots) this.scene.remove(s.mesh);
    for (const t of this.traps) this.scene.remove(t.mesh);
    for (const r of this.rings) this.scene.remove(r.mesh);
    this.shots.length = 0;
    this.traps.length = 0;
    this.rings.length = 0;
    this.track = null;
    this.trackId = null;
  }
}

export function hitKart(kart, audio) {
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
