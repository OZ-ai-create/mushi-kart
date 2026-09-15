import * as THREE from "three";
import { getCourse } from "./courses.js";
import { createObstacles } from "./obstacles.js";

const UP = new THREE.Vector3(0, 1, 0);

export class Track {
  constructor(courseId = "garden") {
    this.course = getCourse(courseId);
    this.courseId = this.course.id;
    this.halfWidth = this.course.halfWidth;
    this.count = 720;
    this._makeCurve();
    this._bake();
  }

  _makeCurve() {
    this.curve = new THREE.CatmullRomCurve3(this.course.points(), true, "centripetal");
    this.length = this.curve.getLength();
  }

  _bake() {
    this.points = [];
    this.tangents = [];
    this.binormals = [];
    this.normals = [];
    this.widths = [];
    for (let i = 0; i < this.count; i++) {
      const t = i / this.count;
      const p = this.curve.getPointAt(t);
      const tan = this.curve.getTangentAt(t);
      tan.y = 0;
      if (tan.lengthSq() < 1e-8) tan.set(1, 0, 0);
      tan.normalize();
      const bin = new THREE.Vector3(-tan.z, 0, tan.x);
      if (bin.lengthSq() < 1e-8) bin.set(1, 0, 0);
      else bin.normalize();
      if (bin.x * p.x + bin.z * p.z < 0) bin.negate();
      this.points.push(p);
      this.tangents.push(tan);
      this.binormals.push(bin);
      this.normals.push(UP.clone());
      const w = typeof this.course.widthAt === "function" ? this.course.widthAt(t) : this.halfWidth;
      this.widths.push(w);
    }
  }

  halfWidthAt(t) {
    const u = ((t % 1) + 1) % 1;
    const f = u * this.count;
    const i = Math.floor(f) % this.count;
    const j = (i + 1) % this.count;
    const k = f - Math.floor(f);
    return this.widths[i] * (1 - k) + this.widths[j] * k;
  }

  at(t) {
    const u = ((t % 1) + 1) % 1;
    const f = u * this.count;
    const i = Math.floor(f) % this.count;
    const j = (i + 1) % this.count;
    const k = f - Math.floor(f);
    const bin = this.binormals[i].clone().lerp(this.binormals[j], k);
    bin.y = 0;
    if (bin.lengthSq() < 1e-8) bin.copy(this.binormals[i]);
    else bin.normalize();
    return {
      point: this.points[i].clone().lerp(this.points[j], k),
      tangent: this.tangents[i].clone().lerp(this.tangents[j], k).setY(0).normalize(),
      binormal: bin,
      normal: UP.clone(),
      t: u,
      halfWidth: this.halfWidthAt(u),
    };
  }

  nearest(pos, hintT = null) {
    return this.project(pos, hintT);
  }

  project(pos, hintT = null) {
    let best = 0;
    let bestD = Infinity;
    if (hintT != null && Number.isFinite(hintT)) {
      const hint = Math.round((((hintT % 1) + 1) % 1) * this.count) % this.count;
      const span = 48;
      for (let k = -span; k <= span; k++) {
        const i = (hint + k + this.count) % this.count;
        const d = pos.distanceToSquared(this.points[i]);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    }
    const far = this.halfWidth * 8;
    if (bestD > far * far) {
      bestD = Infinity;
      for (let i = 0; i < this.count; i += 4) {
        const d = pos.distanceToSquared(this.points[i]);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      for (let k = -8; k <= 8; k++) {
        const i = (best + k + this.count) % this.count;
        const d = pos.distanceToSquared(this.points[i]);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    }
    const p = this.points[best];
    const tan = this.tangents[best];
    const bin = this.binormals[best];
    const rx = pos.x - p.x;
    const rz = pos.z - p.z;
    const along = rx * tan.x + rz * tan.z;
    const lateral = rx * bin.x + rz * bin.z;
    const spacing = this.length / this.count;
    let t = (best + along / Math.max(1e-4, spacing)) / this.count;
    t = ((t % 1) + 1) % 1;
    return {
      index: best,
      t,
      point: p,
      tangent: tan,
      binormal: bin,
      normal: this.normals[best],
      lateral,
    };
  }
}

function roadGeometry(track) {
  const segs = track.count;
  const pos = [];
  const nrm = [];
  const col = [];
  const uv = [];
  const idx = [];
  const c = new THREE.Color();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const f = track.at(t);
    const hw = track.halfWidthAt(t);
    const y = f.point.y + 0.14;
    const lx = f.point.x + f.binormal.x * hw;
    const lz = f.point.z + f.binormal.z * hw;
    const rx = f.point.x - f.binormal.x * hw;
    const rz = f.point.z - f.binormal.z * hw;
    pos.push(lx, y, lz, rx, y, rz);
    nrm.push(0, 1, 0, 0, 1, 0);
    const narrow = hw < track.halfWidth * 0.78;
    c.set(narrow ? track.course.roadB : track.course.roadA);
    col.push(c.r, c.g, c.b, c.r * 0.9, c.g * 0.88, c.b * 0.85);
    uv.push(0, t * 18, 1, t * 18);
    if (i < segs) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

function curbGeometry(track, side) {
  const segs = track.count;
  const pos = [];
  const nrm = [];
  const col = [];
  const idx = [];
  const red = track.course.curbA;
  const cream = track.course.curbB;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const f = track.at(t);
    const hw = track.halfWidthAt(t);
    const inner = hw - 0.08;
    const outer = hw + 0.42;
    const a = f.point.clone().addScaledVector(f.binormal, inner * side).addScaledVector(f.normal, 0.1);
    const b = f.point.clone().addScaledVector(f.binormal, outer * side).addScaledVector(f.normal, 0.22);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    nrm.push(f.normal.x, f.normal.y, f.normal.z, f.normal.x, f.normal.y, f.normal.z);
    const c = Math.floor(t * 48) % 2 === 0 ? red : cream;
    col.push(c[0], c[1], c[2], c[0], c[1], c[2]);
    if (i < segs) {
      const v = i * 2;
      if (side > 0) idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      else idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

function hedgeGeometry(track, side, extra = 0.85) {
  const segs = track.count;
  const pos = [];
  const idx = [];
  const h = 0.72;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const f = track.at(t);
    const lat = (track.halfWidthAt(t) + extra) * side;
    const x = f.point.x + f.binormal.x * lat;
    const z = f.point.z + f.binormal.z * lat;
    pos.push(x, f.point.y - 0.15, z, x, f.point.y + h, z);
    if (i < segs) {
      const v = i * 2;
      if (side > 0) idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      else idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function bannerTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#2f6b32";
  g.fillRect(0, 0, 512, 128);
  g.fillStyle = "#fff6e4";
  g.font = "bold 64px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("むしカート", 256, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function skyDome(course) {
  const geo = new THREE.SphereGeometry(300, 24, 16);
  const [tr, tg, tb] = course.skyTop;
  const [hr, hg, hb] = course.skyHor;
  const [gr, gg, gb] = course.skyGnd;
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {},
    vertexShader: `
      varying vec3 vP;
      void main() {
        vP = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vP;
      void main() {
        float h = normalize(vP).y;
        vec3 top = vec3(${tr}, ${tg}, ${tb});
        vec3 hor = vec3(${hr}, ${hg}, ${hb});
        vec3 gnd = vec3(${gr}, ${gg}, ${gb});
        vec3 col = mix(gnd, hor, smoothstep(-0.35, 0.05, h));
        col = mix(col, top, smoothstep(0.05, 0.55, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  return new THREE.Mesh(geo, mat);
}

export function buildWorld(scene, track) {
  const course = track.course;
  scene.add(skyDome(course));

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(220, 48),
    new THREE.MeshLambertMaterial({ color: course.ground })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const dirt = new THREE.Mesh(
    new THREE.CircleGeometry(18, 28),
    new THREE.MeshLambertMaterial({ color: course.dirt })
  );
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0.02;
  scene.add(dirt);

  if (course.id === "volcano") {
    const lava = new THREE.Mesh(
      new THREE.CircleGeometry(12.5, 32),
      new THREE.MeshLambertMaterial({ color: 0xff6a2a, emissive: 0xbb3300, emissiveIntensity: 0.55 })
    );
    lava.rotation.x = -Math.PI / 2;
    lava.position.y = 0.06;
    scene.add(lava);
    const rim = new THREE.Mesh(
      new THREE.RingGeometry(12.5, 14.4, 32),
      new THREE.MeshLambertMaterial({ color: 0x2a1512 })
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.07;
    scene.add(rim);
  } else {
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(course.id === "sea" ? 16 : 11.5, 32),
      new THREE.MeshLambertMaterial({ color: course.id === "sea" ? 0x3a9fd0 : 0x4aa3b8 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.06;
    scene.add(water);
    const shore = new THREE.Mesh(
      new THREE.RingGeometry(course.id === "sea" ? 16 : 11.5, course.id === "sea" ? 18.2 : 13.2, 32),
      new THREE.MeshLambertMaterial({ color: 0xd8c39a })
    );
    shore.rotation.x = -Math.PI / 2;
    shore.position.y = 0.07;
    scene.add(shore);
  }

  const road = new THREE.Mesh(
    roadGeometry(track),
    new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0x4a3518, emissiveIntensity: 0.18 })
  );
  scene.add(road);
  const curbM = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(curbGeometry(track, 1), curbM));
  scene.add(new THREE.Mesh(curbGeometry(track, -1), curbM.clone()));

  const hedgeM = new THREE.MeshLambertMaterial({ color: course.hedge, side: THREE.DoubleSide });
  scene.add(new THREE.Mesh(hedgeGeometry(track, 1), hedgeM));
  scene.add(new THREE.Mesh(hedgeGeometry(track, -1), hedgeM.clone()));

  const start = track.at(0);
  const hw0 = track.halfWidthAt(0);
  const postGeo = new THREE.CylinderGeometry(0.16, 0.2, 3.2, 8);
  const postM = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(postGeo, postM);
    const p = start.point.clone().addScaledVector(start.binormal, s * (hw0 + 0.6));
    post.position.copy(p);
    post.position.y += 1.5;
    scene.add(post);
  }
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(hw0 * 2 + 1.4, 0.9),
    new THREE.MeshLambertMaterial({ map: bannerTexture(), side: THREE.DoubleSide })
  );
  cloth.position.copy(start.point).addScaledVector(start.normal, 3.05);
  cloth.lookAt(start.point.clone().addScaledVector(start.tangent, -1).addScaledVector(start.normal, 3.05));
  scene.add(cloth);

  const line = new THREE.Mesh(
    new THREE.PlaneGeometry(hw0 * 2 - 0.4, 0.7),
    new THREE.MeshLambertMaterial({ color: 0xf4f0e0, transparent: true, opacity: 0.85 })
  );
  line.position.set(start.point.x, start.point.y + 0.2, start.point.z);
  line.rotation.x = -Math.PI / 2;
  scene.add(line);

  if (course.id === "sea") scatterSea(scene, track);
  else if (course.id === "volcano") scatterVolcano(scene, track);
  else scatterGarden(scene, track);
  const itemBoxes = placeItemBoxes(scene, track);
  const boostPads = placeBoostPads(scene, track);
  addPollen(scene, course.pollen);
  const obstacles = createObstacles(scene, track, course.id);

  return { itemBoxes, boostPads, obstacles };
}

function occupied(track, x, z) {
  const n = track.nearest(new THREE.Vector3(x, 2, z));
  if (Math.abs(n.lateral) < track.halfWidthAt(n.t) + 3.2) return true;
  if (Math.hypot(x, z) < 15) return true;
  return false;
}

function scatterGarden(scene, track) {
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1.4, 6);
  const leafGeo = new THREE.ConeGeometry(1.15, 2.1, 8);
  const trunkM = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
  const leafM = new THREE.MeshLambertMaterial({ color: 0x3d8c3a });
  const trees = 64;
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkM, trees);
  const leaves = new THREE.InstancedMesh(leafGeo, leafM, trees);
  const dummy = new THREE.Object3D();
  let placed = 0;
  let guard = 0;
  while (placed < trees && guard < 800) {
    guard += 1;
    const r = 22 + Math.random() * 95;
    const a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (occupied(track, x, z)) continue;
    const s = 0.8 + Math.random() * 1.1;
    dummy.position.set(x, 0.7 * s, z);
    dummy.scale.set(s, s, s);
    dummy.rotation.y = Math.random() * 6;
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);
    dummy.position.y = 1.9 * s;
    dummy.updateMatrix();
    leaves.setMatrixAt(placed, dummy.matrix);
    placed += 1;
  }
  scene.add(trunks);
  scene.add(leaves);

  const flowerN = 90;
  const stemGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.7, 5);
  const headGeo = new THREE.SphereGeometry(0.22, 8, 6);
  const stemM = new THREE.MeshLambertMaterial({ color: 0x3f7d3a });
  const palettes = [0xe07a5f, 0xf4d35e, 0xf2a7d0, 0x7ad7f0, 0xffffff];
  const stems = new THREE.InstancedMesh(stemGeo, stemM, flowerN);
  const heads = new THREE.InstancedMesh(
    headGeo,
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    flowerN
  );
  placed = 0;
  guard = 0;
  while (placed < flowerN && guard < 900) {
    guard += 1;
    const r = 16 + Math.random() * 90;
    const a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (occupied(track, x, z)) continue;
    dummy.position.set(x, 0.35, z);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    stems.setMatrixAt(placed, dummy.matrix);
    dummy.position.y = 0.72;
    dummy.scale.setScalar(0.8 + Math.random() * 0.5);
    dummy.updateMatrix();
    heads.setMatrixAt(placed, dummy.matrix);
    heads.setColorAt(placed, new THREE.Color(palettes[placed % palettes.length]));
    placed += 1;
  }
  if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  scene.add(stems);
  scene.add(heads);

  scatterRocks(scene, track, 18, 0x8d8a82);
}

function scatterSea(scene, track) {
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 2.4, 6);
  const leafGeo = new THREE.ConeGeometry(0.85, 1.4, 6);
  const trunkM = new THREE.MeshLambertMaterial({ color: 0x8a6a3a });
  const leafM = new THREE.MeshLambertMaterial({ color: 0x2e8f5a });
  const trees = 42;
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkM, trees);
  const leaves = new THREE.InstancedMesh(leafGeo, leafM, trees);
  const dummy = new THREE.Object3D();
  let placed = 0;
  let guard = 0;
  while (placed < trees && guard < 800) {
    guard += 1;
    const r = 20 + Math.random() * 92;
    const a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (occupied(track, x, z)) continue;
    const s = 0.85 + Math.random() * 1.2;
    dummy.position.set(x, 1.1 * s, z);
    dummy.scale.set(s, s, s);
    dummy.rotation.y = Math.random() * 6;
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);
    dummy.position.y = 2.3 * s;
    dummy.updateMatrix();
    leaves.setMatrixAt(placed, dummy.matrix);
    placed += 1;
  }
  scene.add(trunks);
  scene.add(leaves);
  scatterRocks(scene, track, 28, 0xd8c39a);
}

function scatterVolcano(scene, track) {
  const coneGeo = new THREE.ConeGeometry(1.4, 2.6, 7);
  const coneM = new THREE.MeshLambertMaterial({ color: 0x3a2422 });
  const n = 36;
  const cones = new THREE.InstancedMesh(coneGeo, coneM, n);
  const dummy = new THREE.Object3D();
  let placed = 0;
  let guard = 0;
  while (placed < n && guard < 700) {
    guard += 1;
    const r = 22 + Math.random() * 90;
    const a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (occupied(track, x, z)) continue;
    const s = 0.7 + Math.random() * 1.6;
    dummy.position.set(x, 1.1 * s, z);
    dummy.scale.set(s, s, s);
    dummy.rotation.y = Math.random() * 6;
    dummy.updateMatrix();
    cones.setMatrixAt(placed, dummy.matrix);
    placed += 1;
  }
  scene.add(cones);
  scatterRocks(scene, track, 40, 0x4a3a36);
}

function scatterRocks(scene, track, count, color) {
  const rockGeo = new THREE.DodecahedronGeometry(0.55, 0);
  const rockM = new THREE.MeshLambertMaterial({ color });
  for (let i = 0; i < count; i++) {
    const r = 18 + Math.random() * 88;
    const a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (occupied(track, x, z)) continue;
    const rock = new THREE.Mesh(rockGeo, rockM);
    rock.position.set(x, 0.25, z);
    rock.scale.setScalar(0.5 + Math.random() * 1.2);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    scene.add(rock);
  }
}

function honeycombMesh() {
  const g = new THREE.CylinderGeometry(0.55, 0.55, 0.7, 6);
  const m = new THREE.MeshLambertMaterial({ color: 0xf4d35e, emissive: 0x553300, emissiveIntensity: 0.45 });
  const mesh = new THREE.Mesh(g, m);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.14, 6), new THREE.MeshLambertMaterial({ color: 0xe07a5f }));
  cap.position.y = 0.4;
  mesh.add(cap);
  return mesh;
}

function placeItemBoxes(scene, track) {
  const stations = [0.16, 0.37, 0.61, 0.83];
  const boxes = [];
  for (const t of stations) {
    const hw = track.halfWidthAt(t);
    const span = Math.min(2.2, Math.max(0.85, hw - 1.35));
    for (const lat of [-span, 0, span]) {
      const f = track.at(t);
      const mesh = honeycombMesh();
      mesh.position.copy(f.point).addScaledVector(f.binormal, lat);
      mesh.position.y = f.point.y + 0.72;
      scene.add(mesh);
      boxes.push({ t, lateral: lat, mesh, cooldown: 0, baseY: mesh.position.y });
    }
  }
  return boxes;
}

function placeBoostPads(scene, track) {
  const pads = [];
  for (const t of [0.5, 0.96]) {
    const f = track.at(t);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 2.2),
      new THREE.MeshLambertMaterial({ color: 0xff9f43, emissive: 0x663300, side: THREE.DoubleSide })
    );
    mesh.position.set(f.point.x, f.point.y + 0.18, f.point.z);
    mesh.rotation.x = -Math.PI / 2;
    scene.add(mesh);
    pads.push({ t, mesh });
  }
  return pads;
}

function addPollen(scene, color = 0xfff2b0) {
  const n = 160;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = (Math.random() - 0.5) * 120;
    arr[i * 3 + 1] = 1 + Math.random() * 10;
    arr[i * 3 + 2] = (Math.random() - 0.5) * 120;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(
    g,
    new THREE.PointsMaterial({ color, size: 0.18, transparent: true, opacity: 0.65, depthWrite: false })
  );
  pts.userData.pollen = true;
  scene.add(pts);
}
