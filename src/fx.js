import * as THREE from "three";

const _col = new THREE.Color();
const SPARK = [0xfff6d8, 0x8fd4ff, 0xffc45a, 0xfff4e8];

function discTex(inner = 0.12) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(inner, "rgba(255,255,255,0.92)");
  grd.addColorStop(0.45, "rgba(255,255,255,0.38)");
  grd.addColorStop(0.78, "rgba(255,255,255,0.08)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function cloud(scene, count, { additive, order, tex, size }) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) pos[i * 3 + 1] = -80;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setDrawRange(0, 0);
  const mat = new THREE.PointsMaterial({
    map: tex,
    size,
    vertexColors: true,
    transparent: true,
    opacity: additive ? 0.95 : 0.38,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    sizeAttenuation: true,
    alphaTest: 0.02,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = order;
  scene.add(pts);
  const slots = Array.from({ length: count }, () => ({
    on: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    max: 1,
    r: 1,
    g: 1,
    b: 1,
    drag: 2,
    grav: 0,
    size: 0.12,
  }));
  return { geo, pos, col, pts, mat, slots };
}

export class FxWorld {
  constructor(scene, mobile = false) {
    this.scene = scene;
    this.mobile = mobile;
    this._disc = discTex(0.1);
    this._soft = discTex(0.28);
    this.sparks = cloud(scene, mobile ? 220 : 420, { additive: true, order: 8, tex: this._disc, size: 0.28 });
    this.smoke = cloud(scene, mobile ? 90 : 170, { additive: false, order: 5, tex: this._soft, size: 0.62 });
    this.glints = cloud(scene, mobile ? 70 : 130, { additive: true, order: 9, tex: this._disc, size: 0.16 });
    this.skids = [];
    this.rings = [];
    this._skidGeo = new THREE.PlaneGeometry(0.13, 0.58);
    this._skidBase = new THREE.MeshBasicMaterial({
      color: 0x1a120c,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    this._ringGeo = new THREE.RingGeometry(0.18, 0.42, 28);
    this._glowMat = new THREE.SpriteMaterial({
      map: this._disc,
      color: 0xffd27a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.glow = new THREE.Sprite(this._glowMat);
    this.glow.scale.set(1.4, 1.4, 1);
    this.glow.renderOrder = 7;
    scene.add(this.glow);
  }

  spawn(cloud, x, y, z, vx, vy, vz, life, color, drag = 2.4, grav = 0, size = 0.12) {
    const slots = cloud.slots;
    for (let i = 0; i < slots.length; i++) {
      const p = slots[i];
      if (p.on) continue;
      p.on = true;
      p.x = x;
      p.y = y;
      p.z = z;
      p.vx = vx;
      p.vy = vy;
      p.vz = vz;
      p.life = life;
      p.max = life;
      _col.setHex(color);
      p.r = _col.r;
      p.g = _col.g;
      p.b = _col.b;
      p.drag = drag;
      p.grav = grav;
      p.size = size;
      return;
    }
  }

  burst(pos, color = 0xffe08a, n = 18) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.6 + Math.random() * 5.8;
      this.spawn(
        this.sparks,
        pos.x,
        pos.y + 0.38,
        pos.z,
        Math.cos(a) * sp,
        1.1 + Math.random() * 3.6,
        Math.sin(a) * sp,
        0.22 + Math.random() * 0.24,
        color,
        3.4,
        -6.5,
        0.07 + Math.random() * 0.1
      );
      if (i % 4 === 0) {
        this.spawn(
          this.glints,
          pos.x,
          pos.y + 0.52,
          pos.z,
          Math.cos(a) * 1.2,
          1.8 + Math.random(),
          Math.sin(a) * 1.2,
          0.42,
          0xffffff,
          1.4,
          -1.6,
          0.05
        );
      }
    }
    this.shock(pos, color, 0.32);
  }

  pickup(pos) {
    this.burst(pos, 0xffef8a, 12);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      this.spawn(
        this.glints,
        pos.x,
        pos.y + 0.55,
        pos.z,
        Math.cos(a) * 1.6,
        2.4 + Math.random() * 1.4,
        Math.sin(a) * 1.6,
        0.55,
        i % 2 ? 0xfff6c8 : 0xffe08a,
        1.05,
        -2.4,
        0.06
      );
    }
  }

  hit(pos) {
    this.burst(pos, 0xfff3b0, 18);
    for (let i = 0; i < 8; i++) {
      this.spawn(
        this.smoke,
        pos.x,
        pos.y + 0.2,
        pos.z,
        (Math.random() - 0.5) * 2.2,
        0.8 + Math.random() * 0.6,
        (Math.random() - 0.5) * 2.2,
        0.55,
        0xd4cbb8,
        1.05,
        -0.5,
        0.42 + Math.random() * 0.18
      );
    }
    this.shock(pos, 0xffe8c0, 0.4);
  }

  trail(pos, color = 0xffc45a) {
    this.spawn(
      this.glints,
      pos.x,
      pos.y,
      pos.z,
      (Math.random() - 0.5) * 0.4,
      0.15,
      (Math.random() - 0.5) * 0.4,
      0.16 + Math.random() * 0.08,
      color,
      4.2,
      0,
      0.05 + Math.random() * 0.03
    );
  }

  shock(pos, color = 0xffe08a, life = 0.3) {
    const mesh = new THREE.Mesh(
      this._ringGeo,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, pos.y + 0.08, pos.z);
    mesh.renderOrder = 6;
    this.scene.add(mesh);
    this.rings.push({ mesh, life, max: life });
  }

  update(dt, karts, courseId = "garden") {
    const dust = courseId === "sea" ? 0xcbb896 : courseId === "volcano" ? 0x4a3228 : 0x6e8c48;
    let glowOn = false;
    for (const k of karts) {
      this._kart(k, dt, dust);
      if (k.isPlayer && (k.boost > 0 || k.ramT > 0)) {
        glowOn = true;
        const sx = Math.sin(k.yaw);
        const cz = Math.cos(k.yaw);
        const flick = 0.82 + Math.sin(performance.now() * 0.042) * 0.18;
        this.glow.position.set(k.pos.x - sx * 0.82, k.pos.y + 0.28, k.pos.z - cz * 0.82);
        this._glowMat.color.setHex(k.ramT > 0 ? 0xff5a32 : 0xffd27a);
        this._glowMat.opacity = 0.55 * flick;
        const sc = 1.15 + flick * 0.7 + Math.min(0.8, k.boost * 0.25);
        this.glow.scale.set(sc, sc * 0.72, 1);
      }
    }
    if (!glowOn) this._glowMat.opacity = Math.max(0, this._glowMat.opacity - dt * 6);
    this._step(this.sparks, dt);
    this._step(this.smoke, dt);
    this._step(this.glints, dt);
    this._fadeSkids(dt);
    this._fadeRings(dt);
  }

  _kart(k, dt, dust) {
    const sx = Math.sin(k.yaw);
    const cz = Math.cos(k.yaw);
    const rx = cz;
    const rz = -sx;
    const y = k.pos.y + 0.12;
    const stage = k.driftStage || 0;
    const rate = k.isPlayer ? 1 : 0.38;
    const side = k.driftDir >= 0 ? 1 : -1;

    if (k.drifting && k.speed > 8) {
      const c = SPARK[Math.min(3, stage)] || SPARK[0];
      const n = Math.round((2.4 + stage * 2.8) * rate);
      for (let i = 0; i < n; i++) {
        const inner = i % 3 !== 0;
        const w = inner ? -side : side;
        const wx = k.pos.x - sx * 0.58 + rx * w * 0.38;
        const wz = k.pos.z - cz * 0.58 + rz * w * 0.38;
        this.spawn(
          this.sparks,
          wx + (Math.random() - 0.5) * 0.05,
          y + Math.random() * 0.06,
          wz,
          -sx * 1.2 + rx * w * 1.8 + (Math.random() - 0.5) * 1.8,
          0.7 + Math.random() * 3.2,
          -cz * 1.2 + rz * w * 1.8 + (Math.random() - 0.5) * 1.8,
          0.16 + Math.random() * 0.18,
          c,
          2.8,
          -8.5,
          0.1 + stage * 0.03 + Math.random() * 0.05
        );
      }
      if (k.isPlayer && Math.random() < 0.55) {
        this._skid(k, k.pos.x - sx * 0.62 + rx * -side * 0.34, y, k.pos.z - cz * 0.62 + rz * -side * 0.34);
      }
      if (Math.random() < 0.42 * rate) {
        this.spawn(
          this.smoke,
          k.pos.x - sx * 0.5,
          y + 0.04,
          k.pos.z - cz * 0.5,
          -sx * 0.35,
          0.28,
          -cz * 0.35,
          0.48,
          0xc6bfb2,
          0.8,
          0.12,
          0.38
        );
      }
      if (stage >= 2 && Math.random() < 0.35 * rate) {
        this.spawn(
          this.glints,
          k.pos.x - sx * 0.5,
          y + 0.1,
          k.pos.z - cz * 0.5,
          (Math.random() - 0.5) * 1.2,
          2.2,
          (Math.random() - 0.5) * 1.2,
          0.22,
          0xffffff,
          2,
          -4,
          0.04
        );
      }
    }

    if (k.boost > 0 && k.speed > 5) {
      const n = Math.round((k.isPlayer ? 5 : 2) * (k.ramT > 0 ? 1.35 : 1));
      const flame = k.ramT > 0 ? 0xff5a32 : 0xffd27a;
      const hot = k.ramT > 0 ? 0xfff1c2 : 0xfff6e0;
      for (let i = 0; i < n; i++) {
        const lane = i % 2 ? 1 : -1;
        this.spawn(
          this.sparks,
          k.pos.x - sx * 0.78 + rx * lane * 0.16 + (Math.random() - 0.5) * 0.08,
          y + 0.16,
          k.pos.z - cz * 0.78 + rz * lane * 0.16,
          -sx * (8 + Math.random() * 8),
          (Math.random() - 0.5) * 0.9,
          -cz * (8 + Math.random() * 8),
          0.12 + Math.random() * 0.12,
          i % 3 === 0 ? hot : flame,
          3.8,
          0,
          0.12 + Math.random() * 0.07
        );
      }
      if (Math.random() < 0.7 * rate) {
        this.spawn(this.glints, k.pos.x - sx * 0.7, y + 0.2, k.pos.z - cz * 0.7, -sx * 4.5, 0.2, -cz * 4.5, 0.16, 0xffffff, 2.6, 0, 0.05);
      }
    }

    if (k.offroad && k.speed > 6 && Math.random() < 0.55 * rate) {
      this.spawn(
        this.smoke,
        k.pos.x + (Math.random() - 0.5) * 0.4,
        y,
        k.pos.z + (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 1.6,
        0.55,
        (Math.random() - 0.5) * 1.6,
        0.5,
        dust,
        1,
        -0.28,
        0.34
      );
    }

    if (k.justLanded) {
      this.shock(k.pos, 0xe8e0d0, 0.28);
      for (let i = 0; i < Math.round(8 * rate); i++) {
        const a = Math.random() * Math.PI * 2;
        this.spawn(this.smoke, k.pos.x, y, k.pos.z, Math.cos(a) * 2.1, 0.38, Math.sin(a) * 2.1, 0.36, dust, 1.4, 0, 0.32);
      }
    }

    if (k.boostBurst) {
      this.burst({ x: k.pos.x - sx * 0.7, y: y + 0.26, z: k.pos.z - cz * 0.7 }, 0xffe08a, 14);
      k.boostBurst = false;
    }

    if (k.hitFlash > 0.28) {
      if (!k._hitFx) {
        k._hitFx = true;
        this.hit(k.pos);
      }
    } else k._hitFx = false;
  }

  _skid(k, x, y, z) {
    const cap = this.mobile ? 24 : 52;
    if (this.skids.length >= cap) {
      const old = this.skids.shift();
      this.scene.remove(old.mesh);
      old.mesh.material.dispose();
    }
    const mesh = new THREE.Mesh(this._skidGeo, this._skidBase.clone());
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = k.yaw;
    mesh.position.set(x, y + 0.02, z);
    mesh.renderOrder = 2;
    this.scene.add(mesh);
    this.skids.push({ mesh, life: 1.85 });
  }

  _fadeSkids(dt) {
    for (let i = this.skids.length - 1; i >= 0; i--) {
      const s = this.skids[i];
      s.life -= dt;
      s.mesh.material.opacity = Math.max(0, s.life * 0.12);
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        s.mesh.material.dispose();
        this.skids.splice(i, 1);
      }
    }
  }

  _fadeRings(dt) {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const u = 1 - r.life / r.max;
      r.mesh.scale.setScalar(1 + u * 4.8);
      r.mesh.material.opacity = Math.max(0, (1 - u) * 0.55);
      if (r.life <= 0) {
        this.scene.remove(r.mesh);
        r.mesh.material.dispose();
        this.rings.splice(i, 1);
      }
    }
  }

  _step(cloud, dt) {
    const { slots, pos, col, geo } = cloud;
    let w = 0;
    for (let i = 0; i < slots.length; i++) {
      const p = slots[i];
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.on = false;
        continue;
      }
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vy = p.vy * damp + p.grav * dt;
      p.vz *= damp;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const fade = Math.min(1, p.life / Math.max(0.04, p.max * 0.38));
      pos[w * 3] = p.x;
      pos[w * 3 + 1] = p.y;
      pos[w * 3 + 2] = p.z;
      col[w * 3] = p.r * fade;
      col[w * 3 + 1] = p.g * fade;
      col[w * 3 + 2] = p.b * fade;
      w++;
    }
    geo.setDrawRange(0, w);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  dispose() {
    for (const c of [this.sparks, this.smoke, this.glints]) {
      this.scene.remove(c.pts);
      c.geo.dispose();
      c.mat.dispose();
    }
    for (const s of this.skids) {
      this.scene.remove(s.mesh);
      s.mesh.material.dispose();
    }
    for (const r of this.rings) {
      this.scene.remove(r.mesh);
      r.mesh.material.dispose();
    }
    this.skids.length = 0;
    this.rings.length = 0;
    this.scene.remove(this.glow);
    this._glowMat.dispose();
    this._skidGeo.dispose();
    this._skidBase.dispose();
    this._ringGeo.dispose();
    this._disc.dispose();
    this._soft.dispose();
  }
}
