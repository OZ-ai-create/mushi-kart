import * as THREE from "three";
import { CHARACTERS } from "./characters.js";
import { getBody, getTire } from "./garage.js";

function mat(color, extras = {}) {
  return new THREE.MeshLambertMaterial({ color, ...extras });
}

function addShadow(mesh) {
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function buildWheels(root, tire) {
  const r = tire.radius;
  const width = tire.width;
  const geo = new THREE.CylinderGeometry(r, r, width, tire.segments || 10);
  geo.rotateZ(Math.PI / 2);
  const m = mat(tire.color);
  const rimM = tire.rim != null ? mat(tire.rim) : null;
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
      const rimGeo = new THREE.CylinderGeometry(r * 0.42, r * 0.42, width + 0.05, 8);
      rimGeo.rotateZ(Math.PI / 2);
      w.add(addShadow(new THREE.Mesh(rimGeo, rimM)));
    }
    if (tire.id === "spike") {
      for (let i = 0; i < 6; i++) {
        const cone = addShadow(new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.11, 5), mat(0x4a3a2a)));
        const a = (i / 6) * Math.PI * 2;
        cone.position.set(0, Math.sin(a) * (r + 0.02), Math.cos(a) * (r + 0.02));
        cone.rotation.x = -a;
        w.add(cone);
      }
    }
    if (tire.id === "dirt") {
      const capGeo = new THREE.CylinderGeometry(r * 1.05, r * 0.95, width + 0.06, 8);
      capGeo.rotateZ(Math.PI / 2);
      const cap = addShadow(new THREE.Mesh(capGeo, mat(0x3a2a18)));
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
    main = addShadow(new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.14, 1.55), mat(body.color)));
    main.position.set(0, y, 0);
    root.add(main);
    const tip = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.1, 0.42), mat(0x86b36a)));
    tip.position.set(0, y + 0.02, 0.72);
    root.add(tip);
  } else if (body.id === "acorn") {
    main = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 10), mat(body.color)));
    main.scale.set(1.08, 0.58, 1.28);
    main.position.set(0, y + 0.12, 0);
    root.add(main);
    const cap = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.44, 0.2, 8), mat(0x5c4030)));
    cap.position.set(0, y + 0.34, -0.42);
    cap.rotation.x = 0.55;
    root.add(cap);
  } else if (body.id === "honey") {
    const geo = new THREE.CylinderGeometry(0.6, 0.6, 1.38, 6);
    geo.rotateX(Math.PI / 2);
    main = addShadow(new THREE.Mesh(geo, mat(body.color)));
    main.position.set(0, y + 0.08, 0);
    root.add(main);
    for (const z of [-0.28, 0.08, 0.38]) {
      const cell = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 6), mat(0xc9a36a)));
      cell.position.set(0.22, y + 0.22, z);
      root.add(cell);
    }
  } else {
    main = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.18, 1.78), mat(body.color)));
    main.position.set(0, y, 0.04);
    root.add(main);
    const nose = addShadow(new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.52, 8), mat(0xffc4b0)));
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, y, 0.98);
    root.add(nose);
  }
  const seat = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.4), mat(0x5c4030)));
  seat.position.set(0, y + 0.18, -0.12);
  root.add(seat);
  return main;
}

function eyes(root, y, z, spread = 0.22) {
  const w = mat(0xfff8e8);
  const p = mat(0x1a120c);
  for (const s of [-1, 1]) {
    const e = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), w));
    e.position.set(s * spread, y, z);
    root.add(e);
    const dot = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), p));
    dot.position.set(s * spread, y, z + 0.06);
    root.add(dot);
  }
}

function makeBeetle(root) {
  const shell = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), mat(0x2a2118)));
  shell.scale.set(1.05, 0.72, 1.25);
  shell.position.set(0, 0.72, 0.05);
  root.add(shell);
  const horn = addShadow(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.7, 8), mat(0xd8c39a)));
  horn.position.set(0, 1.05, 0.42);
  horn.rotation.x = 0.9;
  root.add(horn);
  const tip = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat(0xd8c39a)));
  tip.position.set(0, 1.22, 0.72);
  root.add(tip);
  eyes(root, 0.78, 0.48, 0.16);
}

function makeLadybug(root) {
  const shell = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 12), mat(0xd62828)));
  shell.scale.set(1.05, 0.7, 1.1);
  shell.position.set(0, 0.7, 0);
  root.add(shell);
  const head = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(0x1a120c)));
  head.position.set(0, 0.68, 0.42);
  root.add(head);
  const spotM = mat(0x1a120c);
  for (const [x, z] of [
    [-0.18, 0.05],
    [0.2, -0.08],
    [-0.08, -0.22],
    [0.16, 0.22],
  ]) {
    const s = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), spotM));
    s.position.set(x, 0.92, z);
    root.add(s);
  }
  eyes(root, 0.72, 0.56, 0.12);
}

function makeBee(root) {
  const body = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), mat(0xf4d35e)));
  body.scale.set(0.9, 0.72, 1.35);
  body.position.set(0, 0.7, 0);
  root.add(body);
  const stripeM = mat(0x1a120c);
  for (const z of [-0.16, 0.08]) {
    const s = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.12), stripeM));
    s.position.set(0, 0.7, z);
    root.add(s);
  }
  const wingM = mat(0xeaf6ff, { transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  const wings = [];
  for (const s of [-1, 1]) {
    const w = addShadow(new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.32), wingM));
    w.position.set(s * 0.28, 0.95, 0.02);
    w.rotation.y = s * 0.4;
    w.rotation.z = s * 0.2;
    root.add(w);
    wings.push(w);
  }
  root.userData.wings = wings;
  eyes(root, 0.78, 0.46, 0.14);
}

function makeHopper(root) {
  const body = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), mat(0x6a994e)));
  body.scale.set(0.85, 0.7, 1.5);
  body.position.set(0, 0.68, 0);
  root.add(body);
  const head = addShadow(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mat(0x86b36a)));
  head.position.set(0, 0.78, 0.46);
  root.add(head);
  const legM = mat(0x4f7a38);
  for (const s of [-1, 1]) {
    const thigh = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.7), legM));
    thigh.position.set(s * 0.32, 0.52, -0.22);
    thigh.rotation.x = 0.6;
    thigh.rotation.y = s * 0.2;
    root.add(thigh);
    const shin = addShadow(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.55), legM));
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
    new THREE.CircleGeometry(0.7, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.03;
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
    new THREE.SphereGeometry(0.95, 12, 10),
    new THREE.MeshLambertMaterial({
      color: 0x88ff99,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
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
    const glow = state.boost ? 0.35 : 0;
    body.material.emissive.setRGB(glow, glow * 0.6, 0);
    shield.visible = !!state.shield;
    if (shield.visible) {
      const s = 1 + Math.sin(performance.now() * 0.008) * 0.06;
      shield.scale.setScalar(s);
    }
  };

  root.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
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
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, canvas.width / canvas.height, 0.1, 40);
  camera.position.set(2.4, 1.8, 3.4);
  camera.lookAt(0, 0.6, 0);
  scene.add(new THREE.HemisphereLight(0xfff2d4, 0x3d5c32, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(4, 8, 3);
  scene.add(sun);
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
