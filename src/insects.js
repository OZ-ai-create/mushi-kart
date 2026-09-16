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

function eyes(root, y, z, spread = 0.22) {
  const w = mat(0xfff8e8, { roughness: 0.28 });
  const p = mat(0x1a120c, { roughness: 0.35 });
  for (const s of [-1, 1]) {
    const e = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 12), w));
    e.position.set(s * spread, y, z);
    root.add(e);
    const dot = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), p));
    dot.position.set(s * spread, y, z + 0.06);
    root.add(dot);
  }
}

function makeBeetle(root) {
  const shell = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), mat(0x2a2118, { roughness: 0.38, metalness: 0.18 })));
  shell.scale.set(1.05, 0.72, 1.25);
  shell.position.set(0, 0.72, 0.05);
  root.add(shell);
  const horn = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.7, 12), mat(0xd8c39a, { roughness: 0.4 })));
  horn.position.set(0, 1.05, 0.42);
  horn.rotation.x = 0.9;
  root.add(horn);
  const tip = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), mat(0xd8c39a)));
  tip.position.set(0, 1.22, 0.72);
  root.add(tip);
  eyes(root, 0.78, 0.48, 0.16);
}

function makeLadybug(root) {
  const shell = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 16), mat(0xd62828, { roughness: 0.42 })));
  shell.scale.set(1.05, 0.7, 1.1);
  shell.position.set(0, 0.7, 0);
  root.add(shell);
  const head = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), mat(0x1a120c, { roughness: 0.5 })));
  head.position.set(0, 0.68, 0.42);
  root.add(head);
  const spotM = mat(0x1a120c, { roughness: 0.55 });
  for (const [x, z] of [
    [-0.18, 0.05],
    [0.2, -0.08],
    [-0.08, -0.22],
    [0.16, 0.22],
  ]) {
    const s = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), spotM));
    s.position.set(x, 0.92, z);
    root.add(s);
  }
  eyes(root, 0.72, 0.56, 0.12);
}

function makeBee(root) {
  const body = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 16), mat(0xf4d35e, { roughness: 0.4 })));
  body.scale.set(0.9, 0.72, 1.35);
  body.position.set(0, 0.7, 0);
  root.add(body);
  const stripeM = mat(0x1a120c, { roughness: 0.55 });
  for (const z of [-0.16, 0.08]) {
    const s = addShadow(new THREE.Mesh(roundBox(0.62, 0.34, 0.12, 3, 0.05), stripeM));
    s.position.set(0, 0.7, z);
    root.add(s);
  }
  const wingM = mat(0xeaf6ff, { transparent: true, opacity: 0.48, roughness: 0.18, metalness: 0.05, side: THREE.DoubleSide });
  const wings = [];
  for (const s of [-1, 1]) {
    const w = addShadow(new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), wingM));
    w.scale.set(1.15, 0.72, 1);
    w.position.set(s * 0.28, 0.95, 0.02);
    w.rotation.y = s * 0.4;
    w.rotation.z = s * 0.2;
    w.castShadow = false;
    root.add(w);
    wings.push(w);
  }
  root.userData.wings = wings;
  eyes(root, 0.78, 0.46, 0.14);
}

function makeHopper(root) {
  const body = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16), mat(0x6a994e, { roughness: 0.48 })));
  body.scale.set(0.85, 0.7, 1.5);
  body.position.set(0, 0.68, 0);
  root.add(body);
  const head = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(0x86b36a)));
  head.position.set(0, 0.78, 0.46);
  root.add(head);
  const legM = mat(0x4f7a38, { roughness: 0.5 });
  for (const s of [-1, 1]) {
    const thigh = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.52, 4, 10), legM));
    thigh.position.set(s * 0.32, 0.52, -0.22);
    thigh.rotation.x = 0.6;
    thigh.rotation.y = s * 0.2;
    root.add(thigh);
    const shin = addShadow(new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.4, 4, 10), legM));
    shin.position.set(s * 0.42, 0.38, -0.55);
    shin.rotation.x = -0.4;
    root.add(shin);
  }
  eyes(root, 0.82, 0.6, 0.12);
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
  rider.position.y = tireDef.radius - 0.28;
  BUILDERS[def.id](rider);
  root.add(rider);
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
    const wings = root.userData.wings;
    if (wings) {
      root.userData.wingT = (root.userData.wingT || 0) + dt * (14 + state.speed * 0.4);
      const a = Math.sin(root.userData.wingT) * 0.45;
      wings[0].rotation.z = 0.25 + a;
      wings[1].rotation.z = -0.25 - a;
    }
    const glow = state.ram ? 0.55 : state.boost ? 0.35 : 0;
    body.material.emissive.setRGB(glow, glow * (state.ram ? 0.18 : 0.6), 0);
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
  camera.position.set(2.4, 1.8, 3.4);
  camera.lookAt(0, 0.6, 0);
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
    mesh.rotation.y += dt * 0.9;
    mesh.userData.update(dt, { speed: 8, steer: Math.sin(now / 600) * 0.4, boost: false, shield: false });
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    renderer.dispose();
  };
}
