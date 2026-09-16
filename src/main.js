import "./style.css";
import { CHARACTERS } from "./characters.js";
import { createPreviewLoop } from "./insects.js";
import { AudioBus } from "./audio.js";
import { Input } from "./controls.js";
import { Game } from "./game.js";
import { BODIES, TIRES, buildLoadout, loadGarage, saveGarage, loadLastRun, saveLastRun, statBars, getBody, getTire } from "./garage.js";
import { COURSES, getCourse } from "./courses.js";
import { getSpecial } from "./specials.js";

const $ = (id) => document.getElementById(id);
const screens = {
  title: $("screen-title"),
  howto: $("screen-howto"),
  records: $("screen-records"),
  select: $("screen-select"),
  race: $("screen-race"),
  result: $("screen-result"),
};

function show(name) {
  for (const [k, el] of Object.entries(screens)) el.classList.toggle("hidden", k !== name);
}

const audio = new AudioBus();
const input = new Input();
input.attach({
  steerZone: $("steer-zone"),
  knob: $("steer-knob"),
  driftBtn: $("btn-drift"),
  itemBtn: $("btn-item"),
  specialBtn: $("btn-special"),
  brakeBtn: $("btn-brake"),
});

const game = new Game($("game-canvas"), audio, {
  onHud: drawHud,
  onBoost: (on) => $("boost-glow").classList.toggle("on", on),
  onBanner: (text) => {
    const el = $("race-banner");
    el.textContent = text;
    setTimeout(() => {
      if (el.textContent === text) el.textContent = "";
    }, 1600);
  },
  onRaceEnd: showResults,
});
game.setInput(input);

const savedGarage = loadGarage();
let selected = savedGarage.charId;
let bodyId = savedGarage.bodyId;
let tireId = savedGarage.tireId;
let courseId = savedGarage.courseId ?? "garden";
let garageTab = "char";
let playMode = "cpu";
let titleStop = createPreviewLoop($("title-canvas"), titleKit);
let selectStop = null;
let lastChar = selected;
const BEST_KEY = "mushi-kart-best";
const RECORDS_KEY = "mushi-kart-records";
const COURSE_IDS = ["garden", "sea", "volcano"];

function emptyCourseRec() {
  return { time: null, cpu: null };
}

function blankRecords() {
  return { garden: emptyCourseRec(), sea: emptyCourseRec(), volcano: emptyCourseRec() };
}

function courseRec(rec, id = courseId) {
  const key = COURSE_IDS.includes(id) ? id : "garden";
  if (!rec[key]) rec[key] = emptyCourseRec();
  return rec[key];
}

function loadRecords() {
  const rec = blankRecords();
  try {
    const raw = JSON.parse(localStorage.getItem(RECORDS_KEY) || "null");
    if (raw && typeof raw === "object") {
      if (raw.garden || raw.sea || raw.volcano) {
        for (const id of COURSE_IDS) {
          const row = raw[id];
          if (row && typeof row === "object") rec[id] = { time: row.time ?? null, cpu: row.cpu ?? null };
        }
        return rec;
      }
      rec.garden = { time: raw.time ?? null, cpu: raw.cpu ?? null };
      return rec;
    }
  } catch {
    /* ignore broken storage */
  }
  const legacy = Number(localStorage.getItem(BEST_KEY) || 0);
  if (legacy > 0) rec.garden.time = { time: legacy, charId: null, at: null };
  return rec;
}

function saveRecords(rec) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(rec));
  const t = courseRec(rec).time?.time || rec.garden?.time?.time;
  if (t) localStorage.setItem(BEST_KEY, String(t));
}

function charLabel(id) {
  if (!id) return "";
  const c = CHARACTERS.find((x) => x.id === id);
  return c ? `${c.emoji} ${c.name}` : "";
}

function fmtDate(at) {
  if (!at) return "";
  const d = new Date(at);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function paintTitleBest() {
  const row = courseRec(loadRecords());
  const el = $("title-best");
  el.textContent = row.time?.time ? `自己ベスト ${fmt(row.time.time)}` : "自己ベスト なし";
}

function titleKit() {
  const last = loadLastRun() || { charId: selected, bodyId, tireId };
  return { charId: last.charId, bodyId: last.bodyId, tireId: last.tireId };
}

function paintLastRun() {
  const last = loadLastRun();
  const btn = $("btn-last-run");
  if (!last) {
    btn.classList.add("hidden");
    return;
  }
  const char = CHARACTERS.find((c) => c.id === last.charId);
  const mode = last.mode === "time" ? "タイムアタック" : "CPU対戦";
  const course = getCourse(last.courseId);
  $("last-run-label").textContent = `${mode}　${course.emoji} ${course.name}　${char?.emoji ?? ""} ${char?.name ?? ""}`;
  btn.classList.remove("hidden");
}

function paintStage() {
  const c = getCourse(courseId);
  $("screen-title").dataset.stage = c.id;
  document.body.dataset.stage = c.id;
  $("title-badge").textContent = c.badge;
  $("title-subtitle").textContent = c.name;
  $("stage-label").textContent = `${c.emoji} ${c.name}`;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", c.id === "volcano" ? "#8a2e1c" : c.id === "sea" ? "#1e7a9a" : "#3d7c3a");
  }
}

function cycleStage() {
  const i = COURSES.findIndex((c) => c.id === courseId);
  courseId = COURSES[(i + 1) % COURSES.length].id;
  persistGarage();
  paintStage();
  unlock();
  audio.playTitle(courseId);
}

function paintGyroBtn() {
  const btn = $("btn-gyro");
  const hint = $("gyro-hint");
  if (!window.isSecureContext) {
    btn.textContent = "傾けてハンドル：HTTPSが必要";
    hint.classList.remove("hidden");
    return;
  }
  hint.classList.add("hidden");
  btn.textContent = `傾けてハンドル：${input.gyroOn ? "オン" : "オフ"}`;
}

function paintTitle() {
  paintStage();
  paintTitleBest();
  paintLastRun();
  paintGyroBtn();
}

function applyLastRun() {
  const last = loadLastRun();
  if (!last) return false;
  selected = last.charId;
  lastChar = last.charId;
  bodyId = last.bodyId;
  tireId = last.tireId;
  courseId = last.courseId ?? courseId;
  playMode = last.mode;
  persistGarage();
  return true;
}

function goLastRun() {
  unlock();
  if (!applyLastRun()) return;
  titleStop?.();
  titleStop = null;
  startRace();
}

function unlock() {
  audio.unlock(courseId);
}

function paintMix() {
  paintMixTrack("mix-bgm", audio.musicVol);
  paintMixTrack("mix-engine", audio.engineVol);
  $("mix-bgm-val").textContent = String(Math.round(audio.musicVol * 100));
  $("mix-engine-val").textContent = String(Math.round(audio.engineVol * 100));
}

function paintMixTrack(id, v) {
  const el = $(id);
  el.querySelector(".mix-fill").style.width = `${v * 100}%`;
  const w = el.clientWidth || 1;
  const pad = 16;
  el.querySelector(".mix-knob").style.left = `${pad + v * Math.max(0, w - pad * 2)}px`;
}

function bindMixTrack(id, apply) {
  const el = $(id);
  const fromX = (clientX) => {
    const r = el.getBoundingClientRect();
    apply(Math.max(0, Math.min(1, (clientX - r.left) / Math.max(1, r.width))));
    paintMix();
  };
  let pid = null;
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    unlock();
    pid = e.pointerId;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* iOS older Safari */
    }
    fromX(e.clientX);
  });
  const move = (e) => {
    if (pid == null || e.pointerId !== pid) return;
    e.preventDefault();
    fromX(e.clientX);
  };
  const end = (e) => {
    if (pid == null || (e && e.pointerId !== pid)) return;
    pid = null;
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
}

function openMix() {
  unlock();
  $("mix-panel").classList.remove("hidden");
  paintMix();
  requestAnimationFrame(paintMix);
}

function closeMix() {
  $("mix-panel").classList.add("hidden");
  if (audio.mode !== "race") audio.setEngine(0, false);
}

function toggleMix() {
  if ($("mix-panel").classList.contains("hidden")) openMix();
  else closeMix();
}

bindMixTrack("mix-bgm", (v) => audio.setMusicVol(v));
bindMixTrack("mix-engine", (v) => audio.setEngineVol(v, true));
$("mix-close").addEventListener("click", closeMix);
$("mix-panel").addEventListener("click", (e) => {
  if (e.target === $("mix-panel")) closeMix();
});
$("btn-pause-mix").addEventListener("click", () => {
  unlock();
  openMix();
});

function goSelect(mode) {
  unlock();
  playMode = mode;
  titleStop?.();
  titleStop = null;
  openSelect();
}

$("btn-time").addEventListener("click", () => goSelect("time"));
$("btn-cpu").addEventListener("click", () => goSelect("cpu"));
$("btn-last-run").addEventListener("click", goLastRun);
$("btn-stage").addEventListener("click", cycleStage);
$("btn-howto").addEventListener("click", () => {
  unlock();
  show("howto");
});
$("btn-records").addEventListener("click", openRecords);
$("title-best").addEventListener("click", openRecords);
$("btn-records-back").addEventListener("click", () => {
  paintTitle();
  show("title");
});
$("btn-music").addEventListener("click", () => {
  unlock();
  toggleMix();
});
$("btn-howto-back").addEventListener("click", () => {
  paintTitle();
  show("title");
});
$("btn-gyro").addEventListener("click", async () => {
  unlock();
  if (!window.isSecureContext) {
    paintGyroBtn();
    return;
  }
  const next = !input.gyroOn;
  await input.enableGyro(next);
  paintGyroBtn();
});
$("btn-race").addEventListener("click", () => {
  unlock();
  persistGarage();
  selectStop?.();
  selectStop = null;
  startRace();
});
for (const btn of document.querySelectorAll(".garage-tabs .tab")) {
  btn.addEventListener("click", () => {
    unlock();
    setGarageTab(btn.dataset.tab);
  });
}
function goToTitle() {
  closeMix();
  closePause();
  game.stop();
  audio.setEngine(0, false);
  audio.playTitle(courseId);
  paintTitle();
  show("title");
  titleStop?.();
  titleStop = createPreviewLoop($("title-canvas"), titleKit);
}

function closePause() {
  $("pause-overlay").classList.add("hidden");
}

function openPause() {
  if (screens.race.classList.contains("hidden")) return;
  if (!game.pause()) return;
  $("pause-overlay").classList.remove("hidden");
}

function resumeRace() {
  closeMix();
  closePause();
  game.resume();
}

$("btn-pause").addEventListener("click", () => {
  unlock();
  openPause();
});
$("btn-resume").addEventListener("click", () => {
  unlock();
  resumeRace();
});
$("btn-pause-retry").addEventListener("click", () => {
  unlock();
  startRace();
});
$("btn-pause-title").addEventListener("click", () => {
  unlock();
  goToTitle();
});
$("btn-retry").addEventListener("click", () => {
  unlock();
  startRace();
});
$("btn-title").addEventListener("click", () => {
  unlock();
  goToTitle();
});
window.addEventListener("keydown", (e) => {
  if (e.code !== "Escape") return;
  if (screens.race.classList.contains("hidden")) return;
  if ($("pause-overlay").classList.contains("hidden")) openPause();
  else resumeRace();
});

function openRecords() {
  unlock();
  const c = getCourse(courseId);
  $("records-course").textContent = `${c.emoji} ${c.name}`;
  const rec = courseRec(loadRecords());
  const timeCard = rec.time?.time
    ? `<div class="record-card">
        <h3>タイムアタック</h3>
        <div class="record-time">${fmt(rec.time.time)}</div>
        ${charLabel(rec.time.charId) ? `<p>${charLabel(rec.time.charId)}</p>` : ""}
        ${fmtDate(rec.time.at) ? `<p class="record-date">${fmtDate(rec.time.at)}</p>` : ""}
      </div>`
    : `<div class="record-card">
        <h3>タイムアタック</h3>
        <p class="record-empty">まだ記録がないよ</p>
      </div>`;

  let cpuInner = `<p class="record-empty">まだ記録がないよ</p>`;
  if (rec.cpu?.place != null) {
    const runner = charLabel(rec.cpu.charId);
    const fastest = rec.cpu.bestTime != null ? fmt(rec.cpu.bestTime) : "";
    cpuInner = `
      <div class="record-row"><span>最高順位</span><strong>${rec.cpu.place}位</strong></div>
      ${fastest ? `<div class="record-row"><span>最速タイム</span><strong>${fastest}</strong></div>` : ""}
      ${runner ? `<p>${runner}</p>` : ""}
      ${fmtDate(rec.cpu.at) ? `<p class="record-date">${fmtDate(rec.cpu.at)}</p>` : ""}
    `;
  }

  $("records-body").innerHTML = `${timeCard}<div class="record-card"><h3>CPU対戦</h3>${cpuInner}</div>`;
  show("records");
}

function persistGarage() {
  saveGarage({ charId: selected, bodyId, tireId, courseId });
}

function currentKit() {
  return { charId: selected, bodyId, tireId };
}

function paintStats() {
  const bars = statBars(buildLoadout(selected, bodyId, tireId));
  $("stat-bars").innerHTML = bars
    .map(
      (s) =>
        `<div class="stat-row"><span>${s.name}</span><div class="stat-track"><div class="stat-fill" style="width:${s.value}%"></div></div></div>`
    )
    .join("");
  $("kit-summary").textContent = `${getBody(bodyId).name} ＋ ${getTire(tireId).name}`;
}

function setGarageTab(tab) {
  garageTab = tab;
  for (const btn of document.querySelectorAll(".garage-tabs .tab")) {
    btn.classList.toggle("on", btn.dataset.tab === tab);
  }
  $("select-title").textContent = tab === "char" ? "だれで走る？" : tab === "body" ? "ボディを選ぶ" : "タイヤを選ぶ";
  paintGarageGrid();
}

function paintGarageGrid() {
  const grid = $("garage-grid");
  grid.innerHTML = "";
  if (garageTab === "char") {
    for (const c of CHARACTERS) {
      const b = document.createElement("button");
      b.className = "char-card" + (c.id === selected ? " selected" : "");
      b.innerHTML = `${c.emoji} ${c.name}<small>${c.tag}</small>`;
      b.addEventListener("click", () => {
        selected = c.id;
        lastChar = c.id;
        persistGarage();
        paintStats();
        paintGarageGrid();
        $("char-desc").textContent = c.desc;
      });
      grid.appendChild(b);
    }
    $("char-desc").textContent = CHARACTERS.find((c) => c.id === selected).desc;
    return;
  }
  const parts = garageTab === "body" ? BODIES : TIRES;
  const current = garageTab === "body" ? bodyId : tireId;
  for (const p of parts) {
    const b = document.createElement("button");
    b.className = "char-card" + (p.id === current ? " selected" : "");
    b.innerHTML = `${p.emoji} ${p.name}<small>${p.tag}</small>`;
    b.addEventListener("click", () => {
      if (garageTab === "body") bodyId = p.id;
      else tireId = p.id;
      persistGarage();
      paintStats();
      paintGarageGrid();
      $("char-desc").textContent = p.desc;
    });
    grid.appendChild(b);
  }
  $("char-desc").textContent = parts.find((p) => p.id === current).desc;
}

function openSelect() {
  show("select");
  const c = getCourse(courseId);
  $("select-course").textContent = `${c.emoji} ${c.name}　3周`;
  const rec = courseRec(loadRecords());
  if (playMode === "time") {
    $("select-mode").textContent = rec.time?.time
      ? `タイムアタック　自己ベスト ${fmt(rec.time.time)}`
      : "タイムアタック";
  } else {
    $("select-mode").textContent =
      rec.cpu?.place != null ? `CPU 3台と対戦　自己ベスト ${rec.cpu.place}位` : "CPU 3台と対戦";
  }
  $("btn-race").textContent = playMode === "time" ? "記録に挑戦" : "レース開始";
  setGarageTab("char");
  paintStats();
  selectStop?.();
  selectStop = createPreviewLoop($("select-canvas"), currentKit);
}

function startRace() {
  persistGarage();
  saveLastRun({ mode: playMode, charId: selected, bodyId, tireId, courseId });
  closeMix();
  closePause();
  $("race-banner").textContent = "";
  $("countdown").textContent = "";
  $("enemy-warn").classList.add("hidden");
  const spec = getSpecial(selected);
  $("special-icon").textContent = spec.icon;
  $("special-name").textContent = spec.name;
  $("special-slot").classList.remove("spent");
  $("btn-special").innerHTML = `必殺<small>${spec.name}</small>`;
  $("btn-special").classList.remove("spent");
  $("btn-special").disabled = false;
  show("race");
  game.resize();
  try {
    game.start(selected, playMode, { bodyId, tireId }, courseId);
  } catch (err) {
    console.error(err);
    goToTitle();
  }
}

function fmt(t) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, "0")}`;
}

function drawHud(h) {
  const vs = h.mode === "cpu";
  $("place-wrap").classList.toggle("hidden", !vs);
  $("hud-standings").classList.toggle("hidden", !vs);
  $("hud-place").textContent = String(h.place);
  $("hud-lap").textContent = `LAP ${h.lap}/${h.laps}`;
  $("hud-time").textContent = fmt(Math.max(0, h.time));
  const best = courseRec(loadRecords()).time?.time;
  $("hud-best").textContent = h.mode === "time" && best ? `ベスト ${fmt(best)}` : "";
  $("item-icon").textContent = h.itemIcon;
  const spec = h.special;
  if (spec) {
    $("special-icon").textContent = spec.icon;
    $("special-name").textContent = spec.ready ? spec.name : "使用済";
    $("special-slot").classList.toggle("spent", !spec.ready);
    const btn = $("btn-special");
    btn.innerHTML = spec.ready ? `必殺<small>${spec.name}</small>` : `必殺<small>使用済</small>`;
    btn.classList.toggle("spent", !spec.ready);
    btn.disabled = !spec.ready;
  }
  const warn = $("enemy-warn");
  if (h.threat?.label) {
    warn.textContent = h.threat.label;
    warn.classList.remove("hidden");
  } else {
    warn.classList.add("hidden");
  }
  if (vs) {
    $("hud-standings").innerHTML = (h.standings || [])
      .map((s) => `<li class="${s.you ? "you" : ""}">${s.place} ${s.emoji} ${s.name}</li>`)
      .join("");
  }
  if (h.countdown >= 0) {
    $("countdown").textContent = h.countdown === 0 ? "ゴー！" : String(h.countdown);
  } else if ($("countdown").textContent && $("countdown").textContent !== "") {
    $("countdown").textContent = "";
  }
  drawMinimap(h);
}

function drawMinimap(h) {
  const c = $("minimap");
  const ctx = c.getContext("2d");
  const w = c.width;
  const hgt = c.height;
  ctx.clearRect(0, 0, w, hgt);
  ctx.save();
  ctx.translate(w / 2, hgt / 2);
  ctx.rotate(-h.yaw);
  const pts = h.track.points;
  let maxR = 1;
  for (const p of pts) maxR = Math.max(maxR, Math.hypot(p.x, p.z));
  const sc = (Math.min(w, hgt) * 0.42) / maxR;
  ctx.beginPath();
  const step = 4;
  for (let i = 0; i < pts.length; i += step) {
    const x = pts[i].x * sc;
    const z = pts[i].z * sc;
    if (i === 0) ctx.moveTo(x, z);
    else ctx.lineTo(x, z);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(90, 60, 30, 0.45)";
  ctx.fill();
  ctx.strokeStyle = "#f4e2a8";
  ctx.lineWidth = 3;
  ctx.stroke();
  for (const e of h.enemies || []) {
    ctx.fillStyle = e.kind === "fish" ? "#3ad0ff" : e.kind === "flame" ? "#ff7a18" : "#ff4d6d";
    ctx.beginPath();
    ctx.arc(e.x * sc, e.z * sc, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const k of h.karts) {
    ctx.fillStyle = k.player ? "#ffd166" : k.color != null ? `#${k.color.toString(16).padStart(6, "0")}` : "#f4f0e0";
    ctx.beginPath();
    ctx.arc(k.x * sc, k.z * sc, k.player ? 5.5 : 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function saveFinish(you, timeMode) {
  if (!you) return "";
  const rec = loadRecords();
  const slot = courseRec(rec, game.courseId || courseId);
  const now = Date.now();
  if (timeMode) {
    if (you.time == null) return "";
    const prev = slot.time?.time;
    if (!prev || you.time < prev) {
      slot.time = { time: you.time, charId: selected, at: now };
      saveRecords(rec);
      paintTitleBest();
      return "自己ベスト更新！";
    }
    return `自己ベスト ${fmt(prev)}`;
  }

  const notes = [];
  if (!slot.cpu) {
    slot.cpu = {
      place: you.place,
      charId: selected,
      at: now,
      bestTime: you.time ?? null,
      bestTimeCharId: selected,
      bestTimeAt: now,
    };
    saveRecords(rec);
    return you.place != null ? "記録に残したよ" : "";
  }
  if (you.place != null && you.place < slot.cpu.place) {
    slot.cpu.place = you.place;
    slot.cpu.charId = selected;
    slot.cpu.at = now;
    notes.push("最高順位更新！");
  }
  if (you.time != null && (slot.cpu.bestTime == null || you.time < slot.cpu.bestTime)) {
    slot.cpu.bestTime = you.time;
    slot.cpu.bestTimeCharId = selected;
    slot.cpu.bestTimeAt = now;
    notes.push("最速タイム更新！");
  }
  if (notes.length) saveRecords(rec);
  else if (slot.cpu.place != null) notes.push(`自己ベスト ${slot.cpu.place}位`);
  return notes.join("　");
}

function showResults(rows) {
  const list = $("result-list");
  list.innerHTML = "";
  const timeMode = game.mode === "time";
  $("result-title").textContent = timeMode ? "タイムアタック" : "CPU対戦 けっか";
  const you = rows.find((r) => r.you);
  $("result-note").textContent = saveFinish(you, timeMode);
  for (const r of rows) {
    const li = document.createElement("li");
    if (r.you) li.classList.add("you");
    const t = r.time != null ? fmt(r.time) : "DNF";
    const extra = r.you ? "（あなた）" : timeMode ? "" : "（CPU）";
    li.innerHTML = `<span>${r.place}位 ${r.emoji} ${r.name}${extra}</span><span>${t}</span>`;
    list.appendChild(li);
  }
  show("result");
  audio.playTitle(courseId);
}

document.addEventListener(
  "touchmove",
  (e) => {
    if (!screens.race.classList.contains("hidden")) e.preventDefault();
  },
  { passive: false }
);

window.addEventListener("orientationchange", () => setTimeout(() => game.resize(), 200));
document.addEventListener("pointerdown", unlock, { once: true });

const isPhone = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (import.meta.env.DEV && !isPhone && typeof __LAN_HOST__ === "string" && __LAN_HOST__ !== "localhost") {
  const proto = location.protocol === "https:" ? "https" : "http";
  const url = `${proto}://${__LAN_HOST__}:${location.port || 5173}/`;
  $("iphone-url").textContent = url;
  $("iphone-qr").src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`;
  $("iphone-join").classList.remove("hidden");
}

paintTitle();

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js", { updateViaCache: "none" })
    .then((reg) => reg.update())
    .catch(() => {});
}
