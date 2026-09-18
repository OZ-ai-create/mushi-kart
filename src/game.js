import * as THREE from "three";
import { CHARACTERS, getCharacter } from "./characters.js";
import { createRacer } from "./insects.js";
import { Track, buildWorld } from "./track.js";
import { Kart, aiInput, bumpKarts } from "./kart.js";
import { ITEM_DEFS, ItemWorld, rollItem, iconOf } from "./items.js";
import { buildLoadout, cpuKit } from "./garage.js";
import { getCourse } from "./courses.js";
import { activateSpecial, aiWantsSpecial, applyRamHits, getSpecial } from "./specials.js";

const LAPS = 3;
const _look = new THREE.Vector3();
const _wanted = new THREE.Vector3();

export class Game {
  constructor(canvas, audio, hooks) {
    this.canvas = canvas;
    this.audio = audio;
    this.hooks = hooks;
    this.running = false;
    this.paused = false;
    this.raf = 0;

    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    this.mobile = mobile;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x9ec9e6, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x9ec9e6, 0.0062);
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.35, 380);
    this.clock = new THREE.Clock();
    this.input = null;
    this.sun = null;
    this._lookSmooth = new THREE.Vector3();
    this._camReady = false;
    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize);
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  start(playerId, mode = "cpu", garage = {}, courseId = "garden") {
    this.stop(false);
    this.playerId = playerId;
    this.mode = mode === "time" ? "time" : "cpu";
    this.garage = garage;
    const course = getCourse(courseId);
    this.courseId = course.id;
    this.elapsed = 0;
    this.phase = "countdown";
    this.countT = 0;
    this.countShown = 4;
    this.finishWait = 0;
    this.ended = false;

    this._wipeScene();
    this._camReady = false;
    this.renderer.setClearColor(course.clear, 1);
    this.scene.fog = new THREE.FogExp2(course.fog, 0.006);
    this.scene.add(new THREE.HemisphereLight(course.hemiSky, course.hemiGnd, course.hemiInt * 0.68));
    const sun = new THREE.DirectionalLight(course.sun, course.sunInt * 0.88);
    sun.position.set(28, 48, 16);
    sun.castShadow = true;
    const map = this.mobile ? 1024 : 2048;
    sun.shadow.mapSize.set(map, map);
    sun.shadow.bias = -0.0007;
    sun.shadow.normalBias = 0.04;
    const box = 26;
    sun.shadow.camera.left = -box;
    sun.shadow.camera.right = box;
    sun.shadow.camera.top = box;
    sun.shadow.camera.bottom = -box;
    sun.shadow.camera.near = 6;
    sun.shadow.camera.far = 110;
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sun = sun;
    const fill = new THREE.DirectionalLight(0xcfe6ff, 0.18);
    fill.position.set(-22, 18, -28);
    this.scene.add(fill);
    this.scene.add(new THREE.AmbientLight(course.ambient, 0.18));

    this.track = new Track(course.id);
    const world = buildWorld(this.scene, this.track);
    this.itemBoxes = world.itemBoxes;
    this.boostPads = world.boostPads;
    this.obstacles = world.obstacles;
    this.items = new ItemWorld(this.scene);

    const others = CHARACTERS.map((c) => c.id).filter((id) => id !== playerId);
    const order = this.mode === "cpu" ? [...others, playerId] : [playerId];
    this.karts = order.map((id, i) => {
      const isPlayer = id === playerId && (this.mode === "time" || i === order.length - 1);
      const kit = isPlayer
        ? { bodyId: garage.bodyId, tireId: garage.tireId }
        : cpuKit(id);
      const stats = buildLoadout(id, kit.bodyId, kit.tireId);
      const mesh = createRacer(id, isPlayer ? null : `${stats.emoji} ${stats.name}`, kit);
      this.scene.add(mesh);
      const kart = new Kart({
        stats,
        mesh,
        isPlayer,
        name: stats.name,
      });
      const t = (1 - 0.018 * (i + 1) + 1) % 1;
      const lat = isPlayer ? 0 : i % 2 === 0 ? -1.35 : 1.35;
      kart.spawn(this.track, t, lat);
      if (!isPlayer) kart.aiOffset = lat;
      return kart;
    });
    this.player = this.karts.find((k) => k.isPlayer) ?? this.karts[0];

    this._snapCamera(true);
    this._followSun();
    this.clock = new THREE.Clock();
    this.running = true;
    this.paused = false;
    this.audio?.playRace?.(course.id);
    this.raf = requestAnimationFrame(() => this._loop());
  }

  setInput(input) {
    this.input = input;
  }

  _trySpecial(kart) {
    if (this.phase !== "racing") return;
    const spec = activateSpecial(kart, { track: this.track, items: this.items, audio: this.audio });
    if (!spec) return;
    const color = spec.id === "horn" ? 0xff6b35 : spec.id === "leap" ? 0x86b36a : spec.id === "lucky" ? 0xff8fab : 0xffe066;
    this.items?.burst?.(kart, color);
    if (kart.isPlayer) this.hooks?.onBanner(spec.banner);
  }

  _loop() {
    if (!this.running) return;
    this.raf = requestAnimationFrame(() => this._loop());
    const dt = Math.min(0.033, this.clock.getDelta());
    if (!this.paused) this._update(dt);
    this._followSun();
    this.renderer.render(this.scene, this.camera);
  }

  pause() {
    if (!this.running || this.paused || this.ended) return false;
    this.paused = true;
    this.audio?.setEngine(0, false);
    return true;
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.clock.getDelta();
  }

  _update(dt) {
    this.scene.traverse((o) => {
      if (o.userData.pollen) o.rotation.y += dt * 0.07;
    });
    for (const box of this.itemBoxes) {
      box.mesh.rotation.y += dt * 2.2;
      const baseY = box.baseY ?? box.mesh.position.y;
      box.mesh.position.y = baseY + Math.sin(performance.now() * 0.0032 + box.t * 10) * 0.16;
      if (box.cooldown > 0) {
        box.cooldown -= dt;
        box.mesh.visible = box.cooldown <= 0;
      }
    }

    if (this.phase === "countdown") {
      this.countT += dt;
      const n = Math.max(0, 3 - Math.floor(this.countT));
      if (n !== this.countShown) {
        this.countShown = n;
        this.audio?.countdown(n);
      }
      this.input?.consumeSpecial();
      this.input?.consumeItem();
      this.karts.forEach((k) => k.mesh.userData.update?.(dt, { speed: 0, steer: 0, boost: false }));
      this.obstacles?.update(dt, this.karts, this.audio, false);
      this._snapCamera(false, dt);
      this.hooks?.onHud(this._hud());
      if (this.countT >= 3.35) this.phase = "racing";
      return;
    }

    this.elapsed += dt;
    const player = this.player;
    const gapBase = player.progress;

    for (const kart of this.karts) {
      if (!kart.isPlayer) {
        const gap = gapBase - kart.progress;
        kart.speedMul = 1 + THREE.MathUtils.clamp(gap * 0.4, -0.14, 0.36);
        kart.aiTimer += dt;
        if (kart.aiTimer > 2.4) {
          kart.aiOffset = THREE.MathUtils.clamp(kart.aiOffset + (Math.random() - 0.5) * 0.9, -2.0, 2.0);
          kart.aiTimer = 0;
        }
      }

      let input;
      if (kart.isPlayer) {
        input = this.input?.sample() ?? { steer: 0, drift: false, brake: false };
        if (this.input?.consumeItem() && kart.item && kart.roulette <= 0) {
          this.items.use(kart, this.karts, this.audio);
        }
        if (this.input?.consumeSpecial()) this._trySpecial(kart);
      } else {
        input = aiInput(kart, this.track, this.karts, this.obstacles?.list ?? []);
        kart.aiItemT = (kart.aiItemT || 0) + dt;
        if (kart.item && kart.roulette <= 0 && kart.aiItemT > 1.4) {
          this.items.use(kart, this.karts, this.audio);
          kart.aiItemT = 0;
        }
        if (aiWantsSpecial(kart, this.karts, this.obstacles?.list ?? [], this.track)) this._trySpecial(kart);
      }
      kart.update(dt, input, this.track);
      if (kart.wantsBoostSfx && kart.isPlayer) this.audio?.boost();
      this._pickups(kart);
      this._boostPads(kart);

      if (!kart.finished && kart.lap >= LAPS) {
        kart.finished = true;
        kart.finishTime = this.elapsed;
        kart.place = this.karts.filter((k) => k.finished).length;
        if (kart.isPlayer) {
          this.phase = "finish";
          this.audio?.finish();
          this.hooks?.onBanner("フィニッシュ！");
        }
      }
    }

    for (let i = 0; i < this.karts.length; i++) {
      for (let j = i + 1; j < this.karts.length; j++) bumpKarts(this.karts[i], this.karts[j]);
    }
    applyRamHits(this.karts, this.audio);
    for (const kart of this.karts) kart.snapToTrack(this.track, true);
    this.items.update(dt, this.karts, this.audio, this.track);
    this.obstacles?.update(dt, this.karts, this.audio, true);

    const live = this.karts.filter((k) => !k.finished).sort((a, b) => b.progress - a.progress);
    live.forEach((k, i) => {
      k.place = this.karts.filter((x) => x.finished).length + i + 1;
    });

    this.audio?.setEngine(player.speed / player.stats.maxSpeed, this.phase !== "countdown");
    this._snapCamera(false, dt);
    this.hooks?.onHud(this._hud());
    this.hooks?.onBoost(player.boost > 0);

    if (this.phase === "finish") {
      this.finishWait += dt;
      if (this.finishWait > 2.8 && !this.ended) {
        this.ended = true;
        this.hooks?.onRaceEnd(this._results());
      }
    }
  }

  _hitsBox(kart, box) {
    const bx = box.mesh.position.x;
    const bz = box.mesh.position.z;
    const r = 2.35;
    const r2 = r * r;
    const dx = kart.pos.x - bx;
    const dz = kart.pos.z - bz;
    if (dx * dx + dz * dz <= r2) return true;

    const ax = kart.lastPos.x;
    const az = kart.lastPos.z;
    const ex = kart.pos.x - ax;
    const ez = kart.pos.z - az;
    const elen2 = ex * ex + ez * ez;
    if (elen2 > 1e-8) {
      let u = ((bx - ax) * ex + (bz - az) * ez) / elen2;
      u = Math.max(0, Math.min(1, u));
      const hx = ax + ex * u - bx;
      const hz = az + ez * u - bz;
      if (hx * hx + hz * hz <= r2) return true;
    }

    const wrap = Math.min(Math.abs(kart.t - box.t), 1 - Math.abs(kart.t - box.t));
    const along = wrap * this.track.length;
    return along < 2.8 && Math.abs(kart.lateral - box.lateral) < 1.95;
  }

  _pickups(kart) {
    if (kart.finished) return;
    const full = !!(kart.item || kart.roulette > 0);
    for (const box of this.itemBoxes) {
      if (box.cooldown > 0 || !box.mesh.visible) continue;
      if (!this._hitsBox(kart, box)) continue;
      if (full) continue;
      box.cooldown = 3.6;
      box.mesh.visible = false;
      kart.roulette = 0.55;
      const got = rollItem(kart.place);
      kart.item = got.id;
      kart.rouletteShow = got;
      kart.aiItemT = 0;
      if (kart.isPlayer) this.audio?.collect();
      break;
    }
  }

  _boostPads(kart) {
    for (const pad of this.boostPads) {
      const dt = Math.abs(kart.t - pad.t);
      const wrap = Math.min(dt, 1 - dt);
      if (wrap < 0.012 && Math.abs(kart.lateral) < 3.2 && kart.speed > 6) {
        if (kart.boost < 0.9) {
          kart.boost = 1.05;
          if (kart.isPlayer) this.audio?.boost();
        }
      }
    }
  }

  _followSun() {
    if (!this.sun || !this.player) return;
    const p = this.player.pos;
    this.sun.position.set(p.x + 22, p.y + 46, p.z + 14);
    this.sun.target.position.set(p.x, p.y, p.z);
    this.sun.target.updateMatrixWorld();
  }

  _snapCamera(instant, dt = 0.016) {
    const p = this.player;
    const back = 8.2 + Math.min(2.4, p.speed * 0.038);
    const height = 4.15;
    _wanted.set(p.pos.x - Math.sin(p.yaw) * back, p.pos.y + height, p.pos.z - Math.cos(p.yaw) * back);
    _look.set(p.pos.x + Math.sin(p.yaw) * 11, p.pos.y + 0.55, p.pos.z + Math.cos(p.yaw) * 11);
    if (instant || !this._camReady) {
      this.camera.position.copy(_wanted);
      this._lookSmooth.copy(_look);
      this._camReady = true;
    } else {
      const k = 1 - Math.exp(-dt * 6.1);
      this.camera.position.lerp(_wanted, k);
      this._lookSmooth.lerp(_look, 1 - Math.exp(-dt * 7.4));
    }
    if (p.stun > 0) {
      this.camera.position.x += (Math.random() - 0.5) * 0.14;
      this.camera.position.y += (Math.random() - 0.5) * 0.07;
    }
    this.camera.lookAt(this._lookSmooth);
    const fov = 56 + Math.min(10, p.speed * 0.22) + (p.boost > 0 ? 4 : 0);
    if (Math.abs(this.camera.fov - fov) > 0.08) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, fov, 5.2, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  _hud() {
    const p = this.player;
    const roulette = p.roulette > 0;
    const icon = roulette
      ? ITEM_DEFS[Math.floor(performance.now() / 80) % ITEM_DEFS.length].icon
      : p.item
        ? iconOf(p.item)
        : "空";
    return {
      mode: this.mode,
      place: p.place,
      lap: Math.min(LAPS, p.lap + 1),
      laps: LAPS,
      time: this.elapsed,
      itemIcon: icon,
      countdown: this.phase === "countdown" ? this.countShown : -1,
      standings: [...this.karts]
        .sort((a, b) => a.place - b.place)
        .map((k) => ({
          place: k.place,
          name: k.name,
          emoji: getCharacter(k.stats.id).emoji,
          you: k.isPlayer,
        })),
      karts: this.karts.map((k) => ({
        x: k.pos.x,
        z: k.pos.z,
        yaw: k.yaw,
        player: k.isPlayer,
        color: k.stats.color,
      })),
      track: this.track,
      yaw: p.yaw,
      enemies: (this.obstacles?.list ?? []).map((o) => ({
        x: o.mesh.position.x,
        z: o.mesh.position.z,
        kind: o.mesh.userData.kind,
      })),
      threat: this._playerThreat(),
      special: (() => {
        const spec = getSpecial(p.stats.id);
        return { ready: !p.specialUsed, name: spec.name, icon: spec.icon };
      })(),
    };
  }

  _playerThreat() {
    const p = this.player;
    if (!p || this.phase === "countdown") return null;
    let best = null;
    let bestD = 14;
    for (const o of this.obstacles?.list ?? []) {
      let ahead = o.t - p.t;
      ahead = ((ahead % 1) + 1) % 1;
      if (ahead > 0.45) continue;
      const dist = ahead * this.track.length;
      if (dist < 0.5 || dist > 14) continue;
      if (Math.abs((o.lat ?? 0) - p.lateral) > 2.9 && dist > 8) continue;
      if (dist >= bestD) continue;
      bestD = dist;
      const kind = o.mesh.userData.kind;
      const label = kind === "fish" ? "🐟 魚が近い！" : kind === "flame" ? "🔥 炎が近い！" : "🐦 鳥が近い！";
      best = { kind, dist, label };
    }
    return best;
  }

  _results() {
    return [...this.karts]
      .sort((a, b) => {
        if (a.finished && b.finished) return a.finishTime - b.finishTime;
        if (a.finished) return -1;
        if (b.finished) return 1;
        return b.progress - a.progress;
      })
      .map((k, i) => ({
        place: i + 1,
        name: k.name,
        you: k.isPlayer,
        time: k.finished ? k.finishTime : null,
        emoji: getCharacter(k.stats.id).emoji,
      }));
  }

  stop(clearScene = true) {
    this.running = false;
    this.paused = false;
    cancelAnimationFrame(this.raf);
    this.audio?.setEngine(0, false);
    if (clearScene) this.audio?.playTitle?.(this.courseId);
    this.items?.dispose();
    this.obstacles?.dispose?.();
    this.obstacles = null;
    this.sun = null;
    if (clearScene) this._wipeScene();
  }

  _wipeScene() {
    while (this.scene.children.length) {
      const obj = this.scene.children[0];
      this.scene.remove(obj);
      obj.traverse((o) => {
        o.geometry?.dispose?.();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        for (const m of mats) {
          m.map?.dispose?.();
          m.dispose?.();
        }
      });
    }
  }

  dispose() {
    this.stop();
    window.removeEventListener("resize", this._onResize);
    this.renderer.dispose();
  }
}

export { LAPS };
