import * as THREE from "three";
import { CHARACTERS } from "./characters.js";
import { getBody, getTire } from "./garage.js";
import { roundBox, std } from "./gfx.js";

function mat(color, extras = {}) {
  return std(color, extras);
}

function addShadow(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildWheels(root, tire) {
  const r = tire.radius;
  const width = tire.width;
  const geo = new THREE.CylinderGeometry(r, r, width, Math.max(18, tire.segments || 18));
  geo.rotateZ(Math.PI / 2);
  const m = mat(tire.color, { roughness: 0.7, metalness: 0.08 });
  const rimM = tire.rim != null ? mat(tire.rim, { roughness: 0.28, metalness: 0.35 }) : null;
  const x = 0.38 + width * 0.55;
  const list = [];
  const spots = [
    [-x, r, 0.52],
    [x, r, 0.52],
    [-x, r, -0.52],
    [x, r, -0.52],
  ];
  for (const [wx, wy, wz] of spots) {
    const w = addShadow(new THREE.Mesh(geo, m));
    w.position.set(wx, wy, wz);
    if (rimM) {
      const rimGeo = new THREE.CylinderGeometry(r * 0.42, r * 0.42, width + 0.05, 16);
      rimGeo.rotateZ(Math.PI / 2);
      w.add(addShadow(new THREE.Mesh(rimGeo, rimM)));
    }
    if (tire.id === "spike") {
      for (let i = 0; i < 6; i++) {
        const cone = addShadow(new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.11, 8), mat(0x4a3a2a)));
        const a = (i / 6) * Math.PI * 2;
        cone.position.set(0, Math.sin(a) * (r + 0.02), Math.cos(a) * (r + 0.02));
        cone.rotation.x = -a;
        w.add(cone);
      }
    }
    if (tire.id === "dirt") {
      const capGeo = new THREE.CylinderGeometry(r * 1.05, r * 0.95, width + 0.06, 16);
      capGeo.rotateZ(Math.PI / 2);
      const cap = addShadow(new THREE.Mesh(capGeo, mat(0x3a2a18, { roughness: 0.85 })));
      cap.scale.set(1, 0.55, 1);
      w.add(cap);
    }
    root.add(w);
    list.push(w);
  }
  return list;
}

function buildChassis(root, body, lift) {
  const y = 0.08 + lift;
  let main;
  if (body.id === "leaf") {
    main = addShadow(new THREE.Mesh(roundBox(1.18, 0.16, 1.55, 4, 0.07), mat(body.color, { roughness: 0.48 })));
    main.position.set(0, y, 0);
    root.add(main);
    const tip = addShadow(new THREE.Mesh(roundBox(0.72, 0.1, 0.42, 3, 0.05), mat(0x86b36a)));
    tip.position.set(0, y + 0.02, 0.72);
    root.add(tip);
  } else if (body.id === "acorn") {
    main = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 16), mat(body.color, { roughness: 0.62 })));
    main.scale.set(1.08, 0.58, 1.28);
    main.position.set(0, y + 0.12, 0);
    root.add(main);
    const cap = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.44, 0.2, 16), mat(0x5c4030, { roughness: 0.78 })));
    cap.position.set(0, y + 0.34, -0.42);
    cap.rotation.x = 0.55;
    root.add(cap);
  } else if (body.id === "honey") {
    const geo = new THREE.CylinderGeometry(0.6, 0.6, 1.38, 12);
    geo.rotateX(Math.PI / 2);
    main = addShadow(new THREE.Mesh(geo, mat(body.color, { roughness: 0.32, metalness: 0.12 })));
    main.position.set(0, y + 0.08, 0);
    root.add(main);
    for (const z of [-0.28, 0.08, 0.38]) {
      const cell = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 8), mat(0xc9a36a)));
      cell.position.set(0.22, y + 0.22, z);
      root.add(cell);
    }
  } else {
    main = addShadow(new THREE.Mesh(roundBox(0.76, 0.18, 1.78, 4, 0.08), mat(body.color, { roughness: 0.42 })));
    main.position.set(0, y, 0.04);
    root.add(main);
    const nose = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12), mat(0xffc4b0, { roughness: 0.4 })));
    nose.scale.set(1, 0.72, 1.15);
    nose.position.set(0, y, 0.98);
    root.add(nose);
  }
  const seat = addShadow(new THREE.Mesh(roundBox(0.55, 0.16, 0.4, 3, 0.05), mat(0x5c4030, { roughness: 0.7 })));
  seat.position.set(0, y + 0.18, -0.12);
  root.add(seat);
  return main;
}

const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vC = new THREE.Vector3();
const _vD = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

function bigEyes(root, y, z, spread, size = 0.14) {
  const white = mat(0xfff6e8, { roughness: 0.28 });
  const pupilM = mat(0x111111, { roughness: 0.22 });
  const hi = mat(0xffffff, { roughness: 0.06 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(s * spread, y, z);
    root.add(eye);

    const ball = addShadow(new THREE.Mesh(new THREE.SphereGeometry(size, 16, 14), white));
    ball.scale.set(0.95, 1.08, 1);
    eye.add(ball);

    const pupil = addShadow(new THREE.Mesh(new THREE.SphereGeometry(size * 0.46, 14, 12), pupilM));
    pupil.scale.set(1.08, 1.08, 0.7);
    pupil.position.set(0, -size * 0.02, size * 0.82);
    eye.add(pupil);

    const disc = addShadow(
      new THREE.Mesh(new THREE.CircleGeometry(size * 0.4, 20), mat(0x111111, { roughness: 0.22, side: THREE.DoubleSide }))
    );
    disc.position.set(0, -size * 0.02, size * 1.02);
    eye.add(disc);

    const shine = new THREE.Mesh(new THREE.SphereGeometry(size * 0.16, 8, 6), hi);
    shine.position.set(s * size * 0.1, size * 0.22, size * 1.02);
    shine.castShadow = false;
    eye.add(shine);
  }
}

function addAntennae(root, { y, z, spread, len, color, segments = 2, droop = 0.35, club = false, flare = 0.22 }) {
  const list = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(s * spread, y, z);
    g.rotation.z = s * flare;
    g.rotation.x = -droop;
    g.userData.side = s;
    g.userData.flare = flare;
    g.userData.droop = droop;
    root.add(g);
    let yOff = 0;
    for (let i = 0; i < segments; i++) {
      const h = len / segments;
      const r0 = club && i === segments - 1 ? 0.03 : 0.013 - i * 0.002;
      const r1 = club && i === segments - 1 ? 0.02 : Math.max(0.006, r0 * 0.7);
      const m = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, 6), mat(color, { roughness: 0.58 })));
      m.position.y = yOff + h * 0.5;
      g.add(m);
      yOff += h;
    }
    list.push(g);
  }
  root.userData.antennae = list;
}

function placeSeg(mesh, a, b) {
  _vC.copy(b).sub(a);
  const len = Math.min(0.62, Math.max(0.06, _vC.length()));
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.scale.set(1, len, 1);
  mesh.quaternion.setFromUnitVectors(_up, _vC.normalize());
}

function addDriveRig(rider, spec) {
  const {
    legColor,
    legR = 0.042,
    shoulderY = 0.58,
    shoulderZ = 0.12,
    shoulderX = 0.24,
    wheelY = 0.5,
    wheelZ = 0.58,
    wheelR = 0.21,
  } = spec;

  const dash = addShadow(new THREE.Mesh(roundBox(0.42, 0.08, 0.18, 3, 0.04), mat(0x5c4030, { roughness: 0.7 })));
  dash.position.set(0, wheelY - 0.16, wheelZ - 0.12);
  rider.add(dash);

  const col = addShadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.04, 0.26, 8), mat(0x4a3424, { roughness: 0.62 }))
  );
  col.position.set(0, wheelY - 0.14, wheelZ - 0.04);
  col.rotation.x = 0.42;
  rider.add(col);

  const wheel = new THREE.Group();
  wheel.position.set(0, wheelY, wheelZ);
  rider.add(wheel);

  const rim = addShadow(
    new THREE.Mesh(new THREE.TorusGeometry(wheelR, 0.038, 10, 28), mat(0xb07a3a, { roughness: 0.38, metalness: 0.12 }))
  );
  wheel.add(rim);
  const hub = addShadow(
    new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.038, 12), mat(0xc9a36a, { roughness: 0.32, metalness: 0.22 }))
  );
  hub.rotation.x = Math.PI / 2;
  wheel.add(hub);
  for (let i = 0; i < 3; i++) {
    const spoke = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.022, wheelR * 1.72, 0.016), mat(0x6b4423, { roughness: 0.5 })));
    spoke.rotation.z = (i / 3) * Math.PI;
    wheel.add(spoke);
  }

  const grips = [];
  for (const s of [-1, 1]) {
    const grip = new THREE.Group();
    grip.position.set(s * wheelR * 0.9, 0.01, 0.02);
    wheel.add(grip);
    const palm = addShadow(new THREE.Mesh(new THREE.SphereGeometry(legR * 1.4, 10, 8), mat(legColor, { roughness: 0.55 })));
    grip.add(palm);
    for (const k of [-1, 1]) {
      const claw = addShadow(new THREE.Mesh(new THREE.ConeGeometry(legR * 0.42, 0.085, 6), mat(0x1a120c, { roughness: 0.4 })));
      claw.position.set(k * legR * 0.9, -0.015, 0.05);
      claw.rotation.x = 1.15;
      grip.add(claw);
    }
    grips.push(grip);
  }

  const arms = [];
  for (const s of [-1, 1]) {
    const upper = addShadow(
      new THREE.Mesh(new THREE.CylinderGeometry(legR, legR * 0.86, 1, 8), mat(legColor, { roughness: 0.52 }))
    );
    const lower = addShadow(
      new THREE.Mesh(new THREE.CylinderGeometry(legR * 0.84, legR * 0.68, 1, 8), mat(legColor, { roughness: 0.52 }))
    );
    rider.add(upper, lower);
    arms.push({
      side: s,
      shoulder: new THREE.Vector3(s * shoulderX, shoulderY, shoulderZ),
      upper,
      lower,
    });
  }

  rider.userData.drive = { wheel, grips, arms, baseY: wheelY };
}

function updateDrive(rider, dt, state) {
  const d = rider.userData.drive;
  if (!d) return;
  rider.updateMatrixWorld(true);
  d.t = (d.t || 0) + dt * (2.5 + Math.min(22, Math.abs(state.speed)) * 0.16);
  const pump = Math.sin(d.t) * 0.1;
  const yank = Math.sin(d.t * 2.05) * 0.04;
  d.wheel.rotation.z = -state.steer * 1.2 + yank;
  d.wheel.rotation.x = -0.48 + pump * 0.4 + Math.abs(state.steer) * 0.08;
  d.wheel.position.y = d.baseY + Math.sin(d.t * 0.5) * 0.012;

  for (let i = 0; i < d.arms.length; i++) {
    const arm = d.arms[i];
    d.grips[i].getWorldPosition(_vB);
    rider.worldToLocal(_vB);
    _vA.copy(arm.shoulder);
    _vD.copy(_vA).lerp(_vB, 0.48);
    _vD.y += 0.1;
    _vD.x += arm.side * 0.06;
    _vD.z -= 0.03;
    placeSeg(arm.upper, _vA, _vD);
    placeSeg(arm.lower, _vD, _vB);
  }
}

const DRIVE = {
  beetle: { legColor: 0x161410, legR: 0.055, shoulderX: 0.34, shoulderY: 0.58, shoulderZ: 0.12, wheelY: 0.46, wheelZ: 0.72, wheelR: 0.24 },
  ladybug: { legColor: 0x1a120c, legR: 0.038, shoulderX: 0.26, shoulderY: 0.58, shoulderZ: 0.12, wheelY: 0.52, wheelZ: 0.66, wheelR: 0.22 },
  bee: { legColor: 0x3b2a18, legR: 0.04, shoulderX: 0.24, shoulderY: 0.58, shoulderZ: 0.12, wheelY: 0.52, wheelZ: 0.64, wheelR: 0.22 },
  hopper: { legColor: 0x7a9a45, legR: 0.042, shoulderX: 0.24, shoulderY: 0.6, shoulderZ: 0.18, wheelY: 0.52, wheelZ: 0.7, wheelR: 0.22 },
};

function makeBeetle(root) {
  const black = mat(0x12100e, { roughness: 0.2, metalness: 0.32 });
  const olive = mat(0xc2a24a, { roughness: 0.4, metalness: 0.1 });
  const spotM = mat(0x1a140c, { roughness: 0.48 });

  const elytra = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.46, 22, 16), olive));
  elytra.scale.set(1.1, 0.66, 1.16);
  elytra.position.set(0, 0.7, -0.08);
  root.add(elytra);
  const suture = addShadow(new THREE.Mesh(roundBox(0.045, 0.07, 0.88, 2, 0.012), black));
  suture.position.set(0, 0.98, -0.06);
  root.add(suture);
  for (const [x, z] of [
    [-0.22, 0.12],
    [0.2, 0.02],
    [-0.12, -0.18],
    [0.18, -0.22],
    [-0.26, -0.32],
    [0.12, 0.22],
    [-0.08, 0.28],
    [0.26, -0.08],
    [0.08, -0.36],
  ]) {
    const s = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), spotM));
    s.position.set(x, 0.93, z);
    root.add(s);
  }

  const thorax = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 14), black));
  thorax.scale.set(1.18, 0.7, 0.95);
  thorax.position.set(0, 0.74, 0.3);
  root.add(thorax);

  const head = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), black));
  head.position.set(0, 0.66, 0.5);
  root.add(head);

  const horn = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.068, 0.82, 12), black));
  horn.position.set(0, 0.98, 0.58);
  horn.rotation.x = Math.PI / 2 - 0.48;
  root.add(horn);
  const tooth = addShadow(new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.11, 8), black));
  tooth.position.set(0, 0.84, 0.66);
  tooth.rotation.x = 1.05;
  root.add(tooth);
  const tip = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), black));
  tip.position.set(0, 1.2, 0.98);
  root.add(tip);

  const low = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.042, 0.4, 10), black));
  low.position.set(0, 0.7, 0.68);
  low.rotation.x = Math.PI / 2 + 0.38;
  root.add(low);
  const lowTip = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), black));
  lowTip.position.set(0, 0.8, 0.9);
  root.add(lowTip);

  addAntennae(root, { y: 0.7, z: 0.48, spread: 0.1, len: 0.15, color: 0x1a120c, segments: 2, droop: -0.15, club: true, flare: 0.35 });
  bigEyes(root, 0.78, 0.58, 0.16, 0.13, 0x1a120c);
  root.userData.shells = [elytra, thorax];
}

function makeLadybug(root) {
  const red = mat(0xe23d28, { roughness: 0.34 });
  const black = mat(0x14110f, { roughness: 0.42 });
  const white = mat(0xf4f0e6, { roughness: 0.38 });
  const shell = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.48, 22, 16), red));
  shell.scale.set(1.08, 0.8, 1.04);
  shell.position.set(0, 0.66, -0.02);
  root.add(shell);
  const suture = addShadow(new THREE.Mesh(roundBox(0.028, 0.055, 0.7, 2, 0.01), black));
  suture.position.set(0, 1.02, 0);
  root.add(suture);
  for (const [x, z] of [
    [0, 0.18],
    [-0.18, 0.06],
    [0.18, 0.06],
    [-0.2, -0.14],
    [0.2, -0.14],
    [-0.1, -0.3],
    [0.1, -0.3],
  ]) {
    const s = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), black));
    s.scale.set(1.15, 0.42, 1.1);
    s.position.set(x, 0.98, z);
    root.add(s);
  }
  const pron = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), black));
  pron.scale.set(1.28, 0.68, 0.82);
  pron.position.set(0, 0.7, 0.36);
  root.add(pron);
  for (const s of [-1, 1]) {
    const w = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 8), white));
    w.position.set(s * 0.12, 0.74, 0.46);
    root.add(w);
  }
  const head = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), black));
  head.position.set(0, 0.64, 0.5);
  root.add(head);
  addAntennae(root, { y: 0.66, z: 0.54, spread: 0.07, len: 0.11, color: 0x1a120c, club: true, droop: 0.2, flare: 0.4 });
  bigEyes(root, 0.76, 0.56, 0.14, 0.125, 0x1a120c);
  root.userData.shells = [shell];
}

function makeBee(root) {
  const fuzz = mat(0xc4a06a, { roughness: 0.82 });
  const amber = mat(0xd4a03a, { roughness: 0.46 });
  const band = mat(0x2a2118, { roughness: 0.5 });
  const thorax = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 14), fuzz));
  thorax.scale.set(1.08, 0.98, 1.12);
  thorax.position.set(0, 0.72, 0.12);
  root.add(thorax);
  const abdomen = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.25, 18, 14), amber));
  abdomen.scale.set(0.92, 0.8, 1.58);
  abdomen.position.set(0, 0.68, -0.28);
  root.add(abdomen);
  for (const [z, w] of [
    [-0.12, 0.11],
    [-0.32, 0.11],
    [-0.5, 0.09],
  ]) {
    const s = addShadow(new THREE.Mesh(roundBox(0.46, 0.26, w, 3, 0.04), band));
    s.position.set(0, 0.68, z);
    root.add(s);
  }
  const head = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 12), mat(0x3b2a18, { roughness: 0.55 })));
  head.position.set(0, 0.7, 0.38);
  root.add(head);
  bigEyes(root, 0.78, 0.46, 0.15, 0.135, 0x1a120c);
  addAntennae(root, { y: 0.74, z: 0.46, spread: 0.055, len: 0.2, color: 0x1a120c, droop: 0.7, segments: 2, flare: 0.18 });
  const wingM = mat(0xeaf4ff, { transparent: true, opacity: 0.36, roughness: 0.12, metalness: 0.05, side: THREE.DoubleSide });
  const wings = [];
  for (const s of [-1, 1]) {
    const front = addShadow(new THREE.Mesh(new THREE.CircleGeometry(0.26, 22), wingM));
    front.scale.set(1.6, 0.68, 1);
    front.position.set(s * 0.22, 0.92, 0.04);
    front.rotation.y = s * 0.55;
    front.rotation.x = -0.38;
    front.castShadow = false;
    front.userData.side = s;
    front.userData.back = false;
    root.add(front);
    wings.push(front);
    const back = addShadow(new THREE.Mesh(new THREE.CircleGeometry(0.2, 18), wingM));
    back.scale.set(1.25, 0.52, 1);
    back.position.set(s * 0.2, 0.88, -0.12);
    back.rotation.y = s * 0.4;
    back.rotation.x = -0.28;
    back.castShadow = false;
    back.userData.side = s;
    back.userData.back = true;
    root.add(back);
    wings.push(back);
  }
  root.userData.wings = wings;
  root.userData.shells = [thorax, abdomen];
}

function makeHopper(root) {
  const green = mat(0x7a9a45, { roughness: 0.55 });
  const tan = mat(0xc4b07a, { roughness: 0.5 });
  const leaf = mat(0x6a8f3a, { roughness: 0.48 });
  const dark = mat(0x3d4a22, { roughness: 0.5 });
  const body = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.27, 18, 14), tan));
  body.scale.set(0.82, 0.72, 1.72);
  body.position.set(0, 0.68, -0.1);
  root.add(body);
  const wing = addShadow(new THREE.Mesh(roundBox(0.44, 0.075, 0.98, 3, 0.04), leaf));
  wing.position.set(0, 0.82, -0.12);
  root.add(wing);
  for (const [x, z] of [
    [-0.1, 0.05],
    [0.12, -0.15],
    [-0.08, -0.32],
    [0.1, 0.22],
    [-0.14, 0.28],
  ]) {
    const sp = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 6), dark));
    sp.scale.set(1.5, 0.32, 1.1);
    sp.position.set(x, 0.88, z);
    root.add(sp);
  }
  const pron = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), tan));
  pron.scale.set(1.18, 0.68, 0.95);
  pron.position.set(0, 0.74, 0.28);
  root.add(pron);
  const head = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), green));
  head.scale.set(1.08, 1.08, 0.82);
  head.position.set(0, 0.76, 0.48);
  root.add(head);
  for (const s of [-1, 1]) {
    const jaw = addShadow(new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.1, 6), tan));
    jaw.position.set(s * 0.048, 0.64, 0.6);
    jaw.rotation.x = 1.15;
    jaw.rotation.z = s * 0.28;
    root.add(jaw);
  }
  bigEyes(root, 0.86, 0.56, 0.17, 0.14, 0x1a120c);
  addAntennae(root, { y: 0.9, z: 0.5, spread: 0.055, len: 0.78, color: 0xc4b07a, segments: 3, droop: 0.22, flare: 0.12 });
  root.userData.shells = [body, wing];
}

const BUILDERS = {
  beetle: makeBeetle,
  ladybug: makeLadybug,
  bee: makeBee,
  hopper: makeHopper,
};

export function createRacer(id, label, kit = {}) {
  const def = CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
  const bodyDef = getBody(kit.bodyId);
  const tireDef = getTire(kit.tireId);
  const root = new THREE.Group();
  const body = buildChassis(root, bodyDef, tireDef.radius);
  const wheelList = buildWheels(root, tireDef);
  const rider = new THREE.Group();
  rider.position.set(0, tireDef.radius - 0.28, -0.14);
  BUILDERS[def.id](rider);
  addDriveRig(rider, DRIVE[def.id] || DRIVE.beetle);
  root.add(rider);
  root.userData.rider = rider;
  if (rider.userData.wings) root.userData.wings = rider.userData.wings;

  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.78, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.03;
  blob.castShadow = false;
  blob.receiveShadow = false;
  root.add(blob);

  if (label) {
    const c = document.createElement("canvas");
    c.width = 384;
    c.height = 96;
    const g = c.getContext("2d");
    g.fillStyle = "rgba(28, 18, 8, 0.78)";
    if (typeof g.roundRect === "function") {
      g.beginPath();
      g.roundRect(8, 12, 368, 72, 22);
      g.fill();
    } else {
      g.fillRect(8, 12, 368, 72);
    }
    g.fillStyle = "#fff6e4";
    g.font = "bold 40px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(label, 192, 50);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const tag = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
    );
    tag.position.y = 2.05;
    tag.scale.set(2.6, 0.65, 1);
    tag.renderOrder = 20;
    root.add(tag);
  }

  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 20, 16),
    std(0x88ff99, {
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      roughness: 0.18,
      metalness: 0.05,
    })
  );
  shield.position.y = 0.7;
  shield.visible = false;
  root.add(shield);
  root.userData.shieldMesh = shield;

  root.userData.update = (dt, state) => {
    const spin = state.speed * dt * 1.7;
    for (const w of wheelList) w.rotation.x -= spin;
    wheelList[0].rotation.y = -state.steer * 0.35;
    wheelList[1].rotation.y = -state.steer * 0.35;
    updateDrive(rider, dt, state);
    const ants = rider.userData.antennae;
    if (ants) {
      const t = performance.now() * 0.004;
      for (const a of ants) {
        const s = a.userData.side;
        a.rotation.z = s * (a.userData.flare + Math.sin(t + s) * 0.07);
        a.rotation.x = -a.userData.droop + Math.sin(t * 1.15 + s * 2) * 0.08;
      }
    }
    const wings = root.userData.wings;
    if (wings) {
      root.userData.wingT = (root.userData.wingT || 0) + dt * (14 + state.speed * 0.4);
      for (const w of wings) {
        const flap = Math.sin(root.userData.wingT + (w.userData.back ? 0.4 : 0)) * 0.5;
        w.rotation.z = Math.sign(w.userData.side || 1) * (0.2 + flap);
      }
    }
    const glow = state.ram ? 0.55 : state.boost ? 0.35 : 0;
    body.material.emissive.setRGB(glow, glow * (state.ram ? 0.18 : 0.6), 0);
    if (rider.userData.shells) {
      for (const s of rider.userData.shells) {
        s.material.emissive?.setRGB(glow * 0.45, glow * (state.ram ? 0.12 : 0.28), 0);
      }
    }
    shield.visible = !!state.shield;
    if (shield.visible) {
      const s = 1 + Math.sin(performance.now() * 0.008) * 0.06;
      shield.scale.setScalar(s);
    }
  };

  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o === blob || o === shield) {
      o.castShadow = false;
      return;
    }
    o.castShadow = true;
    o.receiveShadow = true;
  });
  return root;
}

export function kitKey(kit) {
  if (typeof kit === "string") return `${kit}|leaf|slick`;
  return `${kit.charId}|${kit.bodyId || "leaf"}|${kit.tireId || "slick"}`;
}

function kitOf(kit) {
  if (typeof kit === "string") return { charId: kit, bodyId: "leaf", tireId: "slick" };
  return { charId: kit.charId, bodyId: kit.bodyId || "leaf", tireId: kit.tireId || "slick" };
}

export function createPreviewLoop(canvas, getKit) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.width, canvas.height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, canvas.width / canvas.height, 0.1, 40);
  camera.position.set(1.85, 1.12, 2.35);
  camera.lookAt(0, 0.58, 0.18);
  scene.add(new THREE.HemisphereLight(0xfff2d4, 0x3d5c32, 1.05));
  const sun = new THREE.DirectionalLight(0xffffff, 1.05);
  sun.position.set(4, 8, 3);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xfff5e8, 0.35));
  let kit = kitOf(getKit());
  let mesh = createRacer(kit.charId, null, kit);
  scene.add(mesh);
  let lastKey = kitKey(kit);
  let raf = 0;
  let t0 = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.05, (now - t0) / 1000);
    t0 = now;
    const next = kitOf(getKit());
    const key = kitKey(next);
    if (key !== lastKey) {
      scene.remove(mesh);
      mesh = createRacer(next.charId, null, next);
      scene.add(mesh);
      lastKey = key;
    }
    mesh.rotation.y += dt * 0.55;
    mesh.userData.update(dt, { speed: 10, steer: Math.sin(now / 480) * 0.85, boost: false, shield: false });
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    renderer.dispose();
  };
}
