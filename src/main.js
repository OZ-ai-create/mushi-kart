import "./style.css";
import { CHARACTERS } from "./characters.js";
import { createPreviewLoop } from "./insects.js";
import { AudioBus } from "./audio.js";
import { Input } from "./controls.js";
import { Game } from "./game.js";
import { BODIES, TIRES, ACCESSORIES, buildLoadout, loadGarage, saveGarage, loadLastRun, saveLastRun, statBars, getBody, getTire, getAccessory } from "./garage.js";
import { COURSES, getCourse } from "./courses.js";
import { getSpecial } from "./specials.js";
import {
  loadProfile,
  saveProfile,
  applyRace,
  compareLast,
  shareText,
  dailyFor,
  todayKey,
  isUnlocked,
  tryUnlock,
  unlockCost,
  currentTitle,
  saveGhost,
} from "./progress.js";
import { loadDifficulty, saveDifficulty, inviteUrl, parseInvite } from "./session.js";

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
  onBoost: (on, speed = 0, stun = 0) => {
    const glow = $("boost-glow");
    glow.classList.toggle("on", !!on);
    glow.classList.toggle("hot", !!on && speed > 20);
    $("speed-streaks")?.classList.toggle("on", speed > 13);
    $("speed-streaks")?.classList.toggle("boost", !!on);
    $("hit-veil")?.classList.toggle("on", stun > 0);
  },
  onBanner: (text) => {
    const el = $("race-banner");
    el.textContent = text;
    setTimeout(() => {
      if (el.textContent === text) el.textContent = "";
    }, 1600);
  },
  onRaceEnd: showResults,
  onFinalLap: () => {
    $("final-flash")?.classList.remove("hidden");
    setTimeout(() => $("final-flash")?.classList.add("hidden"), 2200);
  },
});
game.setInput(input);

const savedGarage = loadGarage();
let selected = savedGarage.charId;
let bodyId = savedGarage.bodyId;
let tireId = savedGarage.tireId;
let accId = savedGarage.accId || "none";
let courseId = savedGarage.courseId ?? "garden";
let garageTab = "char";
let playMode = "cpu";
let difficulty = loadDifficulty();
let titleStop = createPreviewLoop($("title-canvas"), titleKit);
let selectStop = null;
let lastChar = selected;
let lastPayload = null;
let tutStep = 0;
let tutActive = false;
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
  const last = loadLastRun() || { charId: selected, bodyId, tireId, accId };
  return { charId: last.charId, bodyId: last.bodyId, tireId: last.tireId, accId: last.accId || accId };
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
  paintDiff();
  const p = loadProfile();
  const title = currentTitle(p);
  const daily = dailyFor(todayKey());
  const done = p.dailyDone?.[todayKey()];
  $("title-meta").textContent = `${title.name}　🪙 ${p.coins || 0}　連続 ${p.streak || 0}日`;
  $("daily-chip").textContent = done ? `今日の課題クリア：${daily.desc}` : `今日の課題：${daily.desc}（+${daily.reward}）`;
}

function paintDiff() {
  for (const btn of document.querySelectorAll(".diff-btn")) {
    btn.classList.toggle("on", btn.dataset.diff === difficulty);
  }
}

function applyLastRun() {
  const last = loadLastRun();
  if (!last) return false;
  selected = last.charId;
  lastChar = last.charId;
  bodyId = last.bodyId;
  tireId = last.tireId;
  accId = last.accId || accId;
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
  const p = loadProfile();
  const ranks = p.charBest?.[courseId] || {};
  const lines = CHARACTERS.map((c) => {
    const t = ranks[`time:${c.id}`];
    const cpu = ranks[`cpu:${c.id}`];
    if (!t && !cpu) return "";
    return `<div class="record-card"><h3>${c.emoji} ${c.name}</h3>${t ? `<div class="record-row"><span>TA</span><strong>${fmt(t.time)}</strong></div>` : ""}${cpu ? `<div class="record-row"><span>CPU</span><strong>${fmt(cpu.time)}</strong></div>` : ""}</div>`;
  }).filter(Boolean);
  $("records-chars").innerHTML = lines.join("") || `<div class="record-card"><p class="record-empty">まだむし別の記録がないよ</p></div>`;
  show("records");
}

function persistGarage() {
  saveGarage({ charId: selected, bodyId, tireId, accId, courseId });
}

function currentKit() {
  return { charId: selected, bodyId, tireId, accId };
}

function paintStats() {
  const bars = statBars(buildLoadout(selected, bodyId, tireId, accId));
  $("stat-bars").innerHTML = bars
    .map(
      (s) =>
        `<div class="stat-row"><span>${s.name}</span><div class="stat-track"><div class="stat-fill" style="width:${s.value}%"></div></div></div>`
    )
    .join("");
  $("kit-summary").textContent = `${getBody(bodyId).name} ＋ ${getTire(tireId).name} ＋ ${getAccessory(accId).name}`;
}

function setGarageTab(tab) {
  garageTab = tab;
  for (const btn of document.querySelectorAll(".garage-tabs .tab")) {
    btn.classList.toggle("on", btn.dataset.tab === tab);
  }
  $("select-title").textContent =
    tab === "char" ? "だれで走る？" : tab === "body" ? "ボディを選ぶ" : tab === "tire" ? "タイヤを選ぶ" : "アクセサリー";
  paintGarageGrid();
}

function paintGarageGrid() {
  const grid = $("garage-grid");
  grid.innerHTML = "";
  const profile = loadProfile();
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
  const kind = garageTab === "body" ? "bodies" : garageTab === "tire" ? "tires" : "accessories";
  const parts = garageTab === "body" ? BODIES : garageTab === "tire" ? TIRES : ACCESSORIES;
  const current = garageTab === "body" ? bodyId : garageTab === "tire" ? tireId : accId;
  for (const p of parts) {
    const unlocked = isUnlocked(profile, kind, p.id);
    const cost = unlockCost(kind, p.id);
    const b = document.createElement("button");
    b.className = "char-card" + (p.id === current ? " selected" : "") + (unlocked ? "" : " locked");
    b.innerHTML = unlocked
      ? `${p.emoji} ${p.name}<small>${p.tag}</small>`
      : `${p.emoji} ${p.name}<small>${p.tag}</small><span class="cost">🪙 ${cost}で解放</span>`;
    b.addEventListener("click", () => {
      if (!unlocked) {
        const res = tryUnlock(loadProfile(), kind, p.id);
        if (!res.ok) {
          $("char-desc").textContent = `コインが足りないよ（${cost}必要）`;
          return;
        }
        audio.ach();
        toastAch(`解放：${p.name}`);
        persistGarage();
        paintStats();
        paintGarageGrid();
        paintTitle();
        return;
      }
      if (garageTab === "body") bodyId = p.id;
      else if (garageTab === "tire") tireId = p.id;
      else accId = p.id;
      persistGarage();
      paintStats();
      paintGarageGrid();
      $("char-desc").textContent = p.desc;
    });
    grid.appendChild(b);
  }
  $("char-desc").textContent = parts.find((p) => p.id === current)?.desc || "";
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
      rec.cpu?.place != null ? `CPU 3台と対戦　自己ベスト ${rec.cpu.place}位　難易度 ${difficulty}` : `CPU 3台と対戦　難易度 ${difficulty}`;
  }
  $("select-coins").textContent = `所持コイン 🪙 ${loadProfile().coins || 0}`;
  $("btn-race").textContent = playMode === "time" ? "記録に挑戦" : "レース開始";
  paintCourseChips();
  setGarageTab("char");
  paintStats();
  selectStop?.();
  selectStop = createPreviewLoop($("select-canvas"), currentKit);
}

function paintCourseChips() {
  const el = $("course-chips");
  if (!el) return;
  el.innerHTML = "";
  for (const c of COURSES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "course-chip" + (c.id === courseId ? " on" : "");
    b.textContent = `${c.emoji} ${c.name}`;
    b.addEventListener("click", () => {
      courseId = c.id;
      persistGarage();
      paintStage();
      $("select-course").textContent = `${c.emoji} ${c.name}　3周`;
      paintCourseChips();
      openSelect();
    });
    el.appendChild(b);
  }
}

function startRace() {
  persistGarage();
  saveLastRun({ mode: playMode, charId: selected, bodyId, tireId, accId, courseId });
  closeMix();
  closePause();
  $("race-banner").textContent = "";
  $("countdown").textContent = "";
  $("start-hint")?.classList.add("hidden");
  $("enemy-warn").classList.add("hidden");
  $("final-flash")?.classList.add("hidden");
  const spec = getSpecial(selected);
  $("special-icon").textContent = spec.icon;
  $("special-name").textContent = spec.name;
  $("special-slot").classList.remove("spent");
  paintSpecialBtn(spec.name, true);
  show("race");
  game.resize();
  beginTutorial();
  try {
    game.start(selected, playMode, { bodyId, tireId, accId, difficulty }, courseId);
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

function paintSpecialBtn(name, ready) {
  const btn = $("btn-special");
  const label = $("special-btn-name");
  if (label) label.textContent = name;
  else btn.innerHTML = `必殺<small id="special-btn-name">${name}</small><kbd class="key-hint">E</kbd>`;
  btn.classList.toggle("spent", !ready);
  btn.disabled = !ready;
}

function drawHud(h) {
  const vs = h.mode === "cpu";
  $("place-wrap").classList.toggle("hidden", !vs);
  $("hud-standings").classList.toggle("hidden", !vs);
  $("hud-place").textContent = String(h.place);
  $("hud-lap").textContent = `LAP ${h.lap}/${h.laps}`;
  $("hud-time").textContent = fmt(Math.max(0, h.time));
  let coinHud = $("hud-coins");
  if (!coinHud) { coinHud=document.createElement("div"); coinHud.id="hud-coins"; coinHud.className="hud-coins"; $("screen-race").appendChild(coinHud); }
  coinHud.textContent = "🪙 " + (h.coins || 0);
  const best = courseRec(loadRecords()).time?.time;
  $("hud-best").textContent = h.mode === "time" && best ? `ベスト ${fmt(best)}` : "";
  $("item-icon").textContent = h.itemIcon;
  const items = h.items || [{ icon: h.itemIcon, on: true }, { icon: "空", on: false }];
  $("item-icon").textContent = items[0]?.icon || h.itemIcon || "空";
  const b = $("item-icon-b");
  if (b) b.textContent = items[1]?.icon || "空";
  $("item-slot")?.classList.toggle("on", !!items[0]?.on);
  $("item-slot-b")?.classList.toggle("on", !!items[1]?.on);
  $("hud-lap")?.classList.toggle("final", !!h.finalLap);
  advanceTutorial(h);
  const spec = h.special;
  if (spec) {
    $("special-icon").textContent = spec.icon;
    $("special-name").textContent = spec.ready ? spec.name : "使用済";
    $("special-slot").classList.toggle("spent", !spec.ready);
    paintSpecialBtn(spec.ready ? spec.name : "使用済", spec.ready);
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
  $("start-hint")?.classList.toggle("hidden", !h.startHint);
  $("speed-streaks")?.classList.toggle("on", (h.speed || 0) > 13);
  $("speed-streaks")?.classList.toggle("boost", !!h.boost);
  $("hit-veil")?.classList.toggle("on", (h.stun || 0) > 0);
  const glow = $("boost-glow");
  glow?.classList.toggle("on", !!h.boost);
  glow?.classList.toggle("hot", !!h.boost && (h.speed || 0) > 20);
  const charge = $("drift-charge");
  if (charge) {
    const stage = h.drifting ? h.driftStage || 0 : 0;
    charge.classList.toggle("hidden", !h.drifting);
    charge.classList.toggle("s1", stage === 1);
    charge.classList.toggle("s2", stage === 2);
    charge.classList.toggle("s3", stage >= 3);
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

function saveFinish(you, timeMode, stats) {
  if (!you) return { note: "", bestUpdate: false };
  const rec = loadRecords();
  const slot = courseRec(rec, game.courseId || courseId);
  const now = Date.now();
  if (timeMode) {
    if (you.time == null) return { note: "", bestUpdate: false };
    const prev = slot.time?.time;
    if (!prev || you.time < prev) {
      slot.time = { time: you.time, charId: selected, at: now, lap: stats?.bestLap ?? null };
      saveRecords(rec);
      paintTitleBest();
      if (stats?.ghostSamples?.length) {
        saveGhost(game.courseId || courseId, {
          time: you.time,
          charId: selected,
          bodyId,
          tireId,
          accId,
          samples: stats.ghostSamples,
        });
      }
      return { note: "自己ベスト更新！", bestUpdate: true, prev };
    }
    return { note: `自己ベスト ${fmt(prev)}`, bestUpdate: false, prev };
  }

  const notes = [];
  let bestUpdate = false;
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
    return { note: you.place != null ? "記録に残したよ" : "", bestUpdate: you.place === 1 };
  }
  if (you.place != null && you.place < slot.cpu.place) {
    slot.cpu.place = you.place;
    slot.cpu.charId = selected;
    slot.cpu.at = now;
    notes.push("最高順位更新！");
    bestUpdate = true;
  }
  if (you.time != null && (slot.cpu.bestTime == null || you.time < slot.cpu.bestTime)) {
    slot.cpu.bestTime = you.time;
    slot.cpu.bestTimeCharId = selected;
    slot.cpu.bestTimeAt = now;
    notes.push("最速タイム更新！");
    bestUpdate = true;
  }
  if (notes.length) saveRecords(rec);
  else if (slot.cpu.place != null) notes.push(`自己ベスト ${slot.cpu.place}位`);
  return { note: notes.join("　"), bestUpdate, prev: slot.cpu.bestTime };
}

function showResults(payload) {
  const rows = payload?.rows || payload;
  const stats = payload?.stats || {};
  const kit = payload?.kit || { charId: selected, emoji: "🐞", name: "", bodyName: getBody(bodyId).name, tireName: getTire(tireId).name };
  lastPayload = payload;
  const list = $("result-list");
  const timeMode = (payload?.mode || game.mode) === "time";
  const you = rows.find((r) => r.you);
  const finish = saveFinish(you, timeMode, stats);
  const summary = {
    mode: timeMode ? "time" : "cpu",
    courseId: payload?.courseId || courseId,
    charId: selected,
    finished: !!stats.finished,
    place: you?.place ?? stats.place,
    time: you?.time ?? stats.time ?? null,
    coins: stats.coins || 0,
    turbos: stats.turbos || 0,
    drifts: stats.drifts || 0,
    shortcuts: stats.shortcuts || 0,
    itemsUsed: stats.itemsUsed || 0,
    itemsHit: stats.itemsHit || 0,
    rocket: stats.rocket || "miss",
    bestUpdate: finish.bestUpdate,
  };
  const before = loadProfile();
  const delta = compareLast(before, summary);
  const applied = applyRace(before, summary);

  $("result-title").textContent = timeMode ? "タイムアタック" : "CPU対戦 けっか";
  const highs = [];
  if (finish.bestUpdate) highs.push("自己ベスト更新！");
  if (delta != null && delta > 0.05) highs.push(`前回より +${delta.toFixed(2)}秒`);
  if ((stats.shortcuts || 0) > 0) highs.push(`ショートカット成功 ${stats.shortcuts}回`);
  if ((stats.turbos || 0) > 0) highs.push(`ターボ${stats.turbos}回成功`);
  $("result-highlight").textContent = highs.join("　") || applied.notes[0] || "";
  $("result-note").textContent = `${finish.note}　🪙今回 ${stats.coins || 0} / 累計 ${applied.profile.coins || 0}`;
  if (applied.newAchs?.length) {
    for (const a of applied.newAchs) toastAch(`実績：${a.name}`);
    audio.ach?.();
  } else if (finish.bestUpdate) audio.best?.();

  $("result-stats").innerHTML = [
    ["順位", you?.place != null ? `${you.place}位` : "-"],
    ["タイム", you?.time != null ? fmt(you.time) : "DNF"],
    ["コイン", String(stats.coins || 0)],
    ["最高速度", `${Math.round(stats.maxSpeed || 0)}`],
    ["むし", `${kit.emoji || ""} ${kit.name || ""}`],
    ["ビルド", `${kit.bodyName || ""} / ${kit.tireName || ""}`],
    ["アイテム", `${stats.itemsUsed || 0}使用 / ${stats.itemsHit || 0}命中`],
    ["ドリフト", `${stats.drifts || 0} / ターボ ${stats.turbos || 0}`],
    ["近道", String(stats.shortcuts || 0)],
    ["ベストラップ", stats.bestLap != null ? fmt(stats.bestLap) : "-"],
  ]
    .map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`)
    .join("");

  list.innerHTML = "";
  for (const r of rows) {
    const li = document.createElement("li");
    if (r.you) li.classList.add("you");
    const t = r.time != null ? fmt(r.time) : "DNF";
    const extra = r.you ? "（あなた）" : timeMode ? "" : "（CPU）";
    li.innerHTML = `<span>${r.place}位 ${r.emoji} ${r.name}${extra}</span><span>${t}</span>`;
    list.appendChild(li);
  }
  drawResultCard({ rows, you, stats, kit, course: getCourse(courseId), bestUpdate: finish.bestUpdate, timeMode });
  bindShare({ summary: { ...summary, delta, bestUpdate: finish.bestUpdate }, course: getCourse(courseId) });
  endTutorial(true);
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
document.body.classList.toggle("pc", !isPhone);
document.body.classList.toggle("touch", isPhone);
if (import.meta.env.DEV && !isPhone && typeof __LAN_HOST__ === "string" && __LAN_HOST__ !== "localhost") {
  const proto = location.protocol === "https:" ? "https" : "http";
  const url = `${proto}://${__LAN_HOST__}:${location.port || 5173}/`;
  $("iphone-url").textContent = url;
  $("iphone-qr").src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}`;
  $("iphone-join").classList.remove("hidden");
}

paintTitle();

const invite = parseInvite();
if (invite.courseId) courseId = invite.courseId;
if (invite.mode) playMode = invite.mode;
if (invite.difficulty) {
  difficulty = saveDifficulty(invite.difficulty);
  paintDiff();
}
if (invite.courseId) persistGarage();
paintTitle();

for (const btn of document.querySelectorAll(".diff-btn")) {
  btn.addEventListener("click", () => {
    difficulty = saveDifficulty(btn.dataset.diff);
    paintDiff();
  });
}

$("item-slot")?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  input.queueSelect(0);
});
$("item-slot-b")?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  input.queueSelect(1);
});

$("btn-result-char")?.addEventListener("click", () => {
  unlock();
  goSelect(playMode);
});
$("btn-result-garage")?.addEventListener("click", () => {
  unlock();
  goSelect(playMode);
  setGarageTab("body");
});
$("btn-result-ta")?.addEventListener("click", () => {
  unlock();
  goSelect("time");
});
$("btn-invite")?.addEventListener("click", async () => {
  const url = inviteUrl({ courseId, mode: playMode, difficulty });
  try {
    if (navigator.share) await navigator.share({ title: "むしカート", text: "むしカートで遊ぼう", url });
    else {
      await navigator.clipboard.writeText(url);
      $("btn-invite").textContent = "コピーしたよ";
      setTimeout(() => ($("btn-invite").textContent = "招待リンクをコピー"), 1200);
    }
  } catch {
    /* cancelled */
  }
});

$("btn-tut-next")?.addEventListener("click", () => {
  tutStep += 1;
  paintTutorial();
});
$("btn-tut-skip")?.addEventListener("click", () => endTutorial(true));

const TUT = [
  { text: "カートはじどうで走るよ", test: () => true },
  { text: "左をすべらせて曲がろう", test: (h) => Math.abs(h.yaw || 0) > 0.2 },
  { text: "ドリフトを長押しして火花を溜めよう", test: (h) => h.drifting || (h.driftStage || 0) > 0 },
  { text: "金色の巣でアイテムを取ろう", test: (h) => (h.items || []).some((s) => s.id) || h.itemIcon !== "空" },
  { text: "必殺はレース中1回だけ。右の必殺ボタン", test: (h) => h.special && !h.special.ready },
  { text: "コース端の緑の印が近道だよ", test: (h) => h.lap >= 2 },
];

function beginTutorial() {
  const p = loadProfile();
  tutActive = !p.tutorialDone;
  tutStep = 0;
  paintTutorial();
}

function endTutorial(save) {
  tutActive = false;
  $("tut-card")?.classList.add("hidden");
  if (save) {
    const p = loadProfile();
    p.tutorialDone = true;
    saveProfile(p);
  }
}

function paintTutorial() {
  const card = $("tut-card");
  if (!card) return;
  if (!tutActive || tutStep >= TUT.length) {
    endTutorial(true);
    return;
  }
  $("tut-text").textContent = TUT[tutStep].text;
  card.classList.remove("hidden");
}

function advanceTutorial(h) {
  if (!tutActive) return;
  if (h.countdown >= 0) return;
  const step = TUT[tutStep];
  if (!step) return endTutorial(true);
  if (tutStep === 0 && h.time > 2.5) tutStep = 1;
  else if (step.test(h) && tutStep > 0) tutStep += 1;
  paintTutorial();
}

function toastAch(text) {
  const el = $("ach-toast");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("hidden");
  clearTimeout(toastAch._t);
  toastAch._t = setTimeout(() => el.classList.add("hidden"), 2400);
}

function bindShare({ summary, course }) {
  const btn = $("btn-share-result");
  if (!btn) return;
  btn.onclick = async () => {
    const text = shareText(summary, course);
    const canvas = $("result-card");
    let file = null;
    try {
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      if (blob && window.File) file = new File([blob], "mushi-kart.png", { type: "image/png" });
    } catch {
      /* ignore */
    }
    try {
      if (navigator.share) {
        const data = { title: "むしカート", text };
        if (file && navigator.canShare?.({ files: [file] })) data.files = [file];
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(text);
        btn.textContent = "コピーしました！";
        setTimeout(() => (btn.textContent = "結果をシェア"), 1200);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = "コピーしました！";
        setTimeout(() => (btn.textContent = "結果をシェア"), 1200);
      } catch {
        /* ignore */
      }
    }
  };
}

function drawResultCard({ you, stats, kit, course, bestUpdate, timeMode }) {
  const canvas = $("result-card");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, course.id === "volcano" ? "#5a2218" : course.id === "sea" ? "#1e5a72" : "#2f6b32");
  g.addColorStop(1, "#1a120c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fff6e4";
  ctx.font = "900 42px sans-serif";
  ctx.fillText("🐞 むしカート", 36, 64);
  ctx.font = "800 28px sans-serif";
  ctx.fillText(`${course.emoji} ${course.name}`, 36, 110);
  ctx.font = "900 72px sans-serif";
  ctx.fillText(timeMode ? fmt(you?.time || 0) : `${you?.place || "-"}位`, 36, 200);
  ctx.font = "800 26px sans-serif";
  ctx.fillText(`${kit.emoji || ""} ${kit.name || ""}　🪙 ${stats.coins || 0}`, 36, 250);
  ctx.fillText(`${kit.bodyName || ""} / ${kit.tireName || ""}`, 36, 290);
  if (you?.time != null && !timeMode) {
    ctx.fillText(`⏱ ${fmt(you.time)}`, 36, 330);
  }
  if (bestUpdate) {
    ctx.fillStyle = "#ffe08a";
    ctx.font = "900 32px sans-serif";
    ctx.fillText("🚀 自己ベスト更新！", 36, 372);
  }
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js", { updateViaCache: "none" })
    .then((reg) => reg.update())
    .catch(() => {});
}
