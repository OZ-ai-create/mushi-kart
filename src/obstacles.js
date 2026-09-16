import * as THREE from "three";
import { hitKart } from "./items.js";
import { std } from "./gfx.js";

function mat(color, extras = {}) {
  return std(color, extras);
}

function glow(color, emissive, intensity = 0.4) {
  return std(color, { emissive, emissiveIntensity: intensity, roughness: 0.42, metalness: 0.08 });
}

function addHalo(g, color) {
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 28),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.35;
  halo.userData.halo = true;
  g.add(halo);
  g.userData.halo = halo;
  return halo;
}

function makeBird({ plumage = 0xe63946, belly = 0xfff3c4, wingColor = 0xffd166 } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.58, 18, 14), glow(plumage, 0x661122, 0.35));
  body.scale.set(1.2, 0.88, 1.5);
  g.add(body);
  const tum = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 12), glow(belly, 0x886622, 0.22));
  tum.position.set(0, -0.14, 0.1);
  tum.scale.set(1.05, 0.72, 1.25);
  g.add(tum);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), glow(plumage, 0x661122, 0.35));
  head.position.set(0, 0.22, 0.68);
  g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 6), glow(0xff9f1c, 0xff6600, 0.7));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.14, 1.02);
  g.add(beak);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mat(0xffffff, { roughness: 0.28 }));
    eye.position.set(s * 0.18, 0.3, 0.9);
    g.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), mat(0x140c08));
    pupil.position.set(s * 0.18, 0.3, 0.98);
    g.add(pupil);
  }
  const wings = [];
  for (const s of [-1, 1]) {
    const geo = new THREE.BoxGeometry(1.55, 0.08, 0.62, 2, 1, 2);
    geo.translate(s * 0.72, 0, 0);
    const wing = new THREE.Mesh(geo, glow(wingColor, 0xaa5500, 0.45));
    wing.position.set(s * 0.18, 0.16, 0.05);
    g.add(wing);
    wings.push(wing);
  }
  const crest = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 5), glow(0xffd166, 0xff9900, 0.5));
  crest.position.set(0, 0.52, 0.62);
  g.add(crest);
  addHalo(g, 0xffdd44);
  g.userData.wings = wings;
  g.userData.kind = "bird";
  g.scale.setScalar(1.2);
  return g;
}

function makeFish({ body = 0xffe66d, fin = 0xff6b35, stripe = 0x00bbf9 } = {}) {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), glow(body, 0x886600, 0.45));
  torso.scale.set(0.9, 0.95, 1.85);
  g.add(torso);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.09, 6, 14), glow(stripe, 0x006688, 0.55));
  band.rotation.y = Math.PI / 2;
  g.add(band);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.78, 5), glow(fin, 0xaa2200, 0.4));
  tail.rotation.x = -Math.PI / 2;
  tail.position.z = -1.05;
  g.add(tail);
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 5), glow(fin, 0xaa2200, 0.4));
  dorsal.position.set(0, 0.58, 0.05);
  g.add(dorsal);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.42), glow(stripe, 0x006688, 0.4));
    side.position.set(s * 0.48, 0.02, 0.05);
    side.rotation.z = s * 0.45;
    g.add(side);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat(0xffffff));
    eye.position.set(s * 0.22, 0.16, 0.72);
    g.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), mat(0x140c08));
    pupil.position.set(s * 0.22, 0.16, 0.82);
    g.add(pupil);
  }
  addHalo(g, 0x66f0ff);
  g.userData.tail = tail;
  g.userData.kind = "fish";
  g.scale.setScalar(1.15);
  return g;
}

function makeFlame() {
  const g = new THREE.Group();
  const cones = [];
  const layers = [
    { h: 1.75, r: 0.7, c: 0xff2a00, e: 0xff3300, y: 0.12 },
    { h: 1.25, r: 0.46, c: 0xff7a18, e: 0xff5500, y: 0.38 },
    { h: 0.78, r: 0.24, c: 0xfff3b0, e: 0xffee88, y: 0.62 },
  ];
  for (const L of layers) {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(L.r, L.h, 14),
      glow(L.c, L.e, 0.95)
    );
    m.position.y = L.y;
    g.add(m);
    cones.push(m);
  }
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 14, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8 })
  );
  core.position.y = 0.28;
  g.add(core);
  addHalo(g, 0xff6a00);
  g.userData.cones = cones;
  g.userData.core = core;
  g.userData.kind = "flame";
  g.scale.setScalar(1.25);
  return g;
}

const MAKERS = {
  birdRed: () => makeBird({ plumage: 0xe63946, belly: 0xfff3c4, wingColor: 0xffd166 }),
  birdBlue: () => makeBird({ plumage: 0x1d3557, belly: 0xf1faee, wingColor: 0xff9f1c }),
  fishGold: () => makeFish({ body: 0xffe66d, fin: 0xff6b35, stripe: 0x00bbf9 }),
  fishPink: () => makeFish({ body: 0xff8fab, fin: 0x7b2cbf, stripe: 0x80ffdb }),
  flame: makeFlame,
};

const LAYOUTS = {
  garden: [
    { type: "cross", t: 0.18, kind: "birdRed", freq: 1.05, phase: 0 },
    { type: "bounce", t: 0.38, kind: "birdBlue", freq: 1.85, lat: -1.4, phase: 0 },
    { type: "cross", t: 0.58, kind: "birdRed", freq: 1.25, phase: 1.6 },
    { type: "spin", t: 0.76, kind: "birdBlue", spin: 2.2, lat: 1.6, phase: 0 },
    { type: "cross", t: 0.92, kind: "birdRed", freq: 0.95, phase: 3.1 },
  ],
  sea: [
    { type: "cross", t: 0.16, kind: "fishGold", freq: 1.0, phase: 0 },
    { type: "bounce", t: 0.36, kind: "fishPink", freq: 1.7, lat: 0.8, phase: 0 },
    { type: "cross", t: 0.55, kind: "fishGold", freq: 1.2, phase: 1.6 },
    { type: "spin", t: 0.74, kind: "fishPink", spin: 1.9, lat: -1.5, phase: 0 },
    { type: "cross", t: 0.9, kind: "fishGold", freq: 1.1, phase: 3.1 },
  ],
  volcano: [
    { type: "cross", t: 0.17, kind: "flame", freq: 0.95, phase: 0 },
    { type: "bounce", t: 0.4, kind: "flame", freq: 2.15, lat: 1.0, phase: 0 },
    { type: "spin", t: 0.6, kind: "flame", spin: 3.2, lat: -1.1, phase: 0 },
    { type: "bounce", t: 0.78, kind: "flame", freq: 1.9, lat: -0.4, phase: 1.2 },
    { type: "cross", t: 0.93, kind: "flame", freq: 1.15, phase: 3.1 },
  ],
};

function faceAlong(mesh, binormal, sign) {
  const s = sign >= 0 ? 1 : -1;
  mesh.rotation.y = Math.atan2(binormal.x * s, binormal.z * s);
}

function animateEnemy(o, dt) {
  const ud = o.mesh.userData;
  if (ud.wings) {
    const flap = Math.sin(o.time * 16) * 0.62;
    ud.wings[0].rotation.z = flap;
    ud.wings[1].rotation.z = -flap;
  }
  if (ud.tail) ud.tail.rotation.y = Math.sin(o.time * 9) * 0.5;
  if (ud.cones) {
    ud.cones.forEach((c, i) => {
      const w = 1 + Math.sin(o.time * 11 + i) * 0.14;
      c.scale.set(w, 1 + Math.sin(o.time * 13 + i * 0.8) * 0.16, w);
    });
  }
  if (ud.core) ud.core.scale.setScalar(1 + Math.sin(o.time * 15) * 0.22);
  if (ud.halo) {
    const p = 1.08 + Math.sin(o.time * 7) * 0.22;
    ud.halo.scale.set(p, p, p);
    ud.halo.material.opacity = 0.38 + Math.sin(o.time * 7) * 0.14;
  }
}

export function createObstacles(scene, track, courseId) {
  const layout = LAYOUTS[courseId] ?? LAYOUTS.garden;
  const list = [];
  for (const def of layout) {
    const mesh = (MAKERS[def.kind] ?? makeFlame)();
    mesh.traverse((o) => {
      if (o.isMesh && !o.userData.halo) o.castShadow = true;
    });
    scene.add(mesh);
    list.push({
      ...def,
      mesh,
      time: def.phase ?? 0,
      hop: 0,
      lat: def.lat ?? 0,
      hitCD: 0,
      radius: 1.55,
    });
  }
  return {
    list,
    update(dt, karts, audio, collide) {
      for (const o of this.list) {
        o.time += dt;
        if (o.hitCD > 0) o.hitCD -= dt;
        const f = track.at(o.t);
        const kind = o.mesh.userData.kind;
        if (o.type === "cross") {
          const amp = Math.max(0.9, track.halfWidthAt(o.t) - 1.55);
          o.lat = Math.sin(o.time * o.freq) * amp;
          faceAlong(o.mesh, f.binormal, Math.cos(o.time * o.freq));
        } else if (o.type === "bounce") {
          o.hop = Math.abs(Math.sin(o.time * o.freq)) * (kind === "bird" ? 2.1 : 1.7);
          const hw = track.halfWidthAt(o.t);
          o.lat = Math.max(-(hw - 1.2), Math.min(hw - 1.2, o.lat));
          if (kind !== "flame") faceAlong(o.mesh, f.tangent, 1);
        } else {
          o.mesh.rotation.y = o.time * (o.spin || 2);
          const hw = track.halfWidthAt(o.t);
          o.lat = Math.max(-(hw - 1.2), Math.min(hw - 1.2, o.lat));
        }
        const lift = kind === "bird" ? 0.95 : kind === "fish" ? 0.42 : 0.55;
        o.mesh.position.copy(f.point).addScaledVector(f.binormal, o.lat);
        o.mesh.position.y = f.point.y + lift + o.hop;
        animateEnemy(o, dt);
        if (!collide) continue;
        for (const k of karts) {
          if (k.finished || o.hitCD > 0 || k.ramT > 0 || k.ghostT > 0 || k.leapT > 0) continue;
          const dx = k.pos.x - o.mesh.position.x;
          const dz = k.pos.z - o.mesh.position.z;
          if (dx * dx + dz * dz < o.radius * o.radius) {
            hitKart(k, audio);
            o.hitCD = 0.85;
          }
        }
      }
    },
    dispose() {
      for (const o of this.list) scene.remove(o.mesh);
      this.list.length = 0;
    },
  };
}
