import { CHARACTERS, getCharacter } from "./characters.js";

export const BODIES = [
  {
    id: "leaf",
    name: "はっぱ号",
    emoji: "🍃",
    tag: "軽い・曲がり",
    desc: "木の葉みたいに軽い。曲がりやすくて出足もいい",
    color: 0x6a994e,
    maxSpeed: -1.4,
    accel: 1.2,
    handling: 0.32,
    weight: -0.22,
  },
  {
    id: "acorn",
    name: "どんぐり号",
    emoji: "🌰",
    tag: "重い・スピード",
    desc: "ずっしり重い。トップスピードが出るけど曲がりにくい",
    color: 0x8b5a2b,
    maxSpeed: 2.4,
    accel: -2.0,
    handling: -0.32,
    weight: 0.35,
  },
  {
    id: "honey",
    name: "みつばち号",
    emoji: "🍯",
    tag: "加速",
    desc: "ハチミツタンク。ゴーの瞬間からぐんぐん加速する",
    color: 0xf4d35e,
    maxSpeed: -0.6,
    accel: 3.6,
    handling: 0.05,
    weight: 0.08,
  },
  {
    id: "stream",
    name: "つばき号",
    emoji: "🌸",
    tag: "速い・スマート",
    desc: "細長い花びらボディ。スピード寄りのかるい車体",
    color: 0xe07a5f,
    maxSpeed: 1.6,
    accel: 0.2,
    handling: -0.05,
    weight: -0.08,
  },
];

export const TIRES = [
  {
    id: "slick",
    name: "すべりこま",
    emoji: "⚫",
    tag: "曲がり・軽い",
    desc: "細いタイヤ。路面でよく曲がる。芝の外は苦手",
    color: 0x1a120c,
    rim: 0xc9a36a,
    radius: 0.24,
    width: 0.16,
    segments: 24,
    maxSpeed: 0.3,
    accel: 0.4,
    handling: 0.38,
    weight: -0.1,
    offroadMul: 0.58,
  },
  {
    id: "dirt",
    name: "つちタイヤ",
    emoji: "🟤",
    tag: "安定・重い",
    desc: "太い土タイヤ。重くて安定。コースアウトしても減速しにくい",
    color: 0x5c4030,
    rim: 0x2a2118,
    radius: 0.32,
    width: 0.3,
    segments: 20,
    maxSpeed: -0.5,
    accel: -0.6,
    handling: -0.08,
    weight: 0.2,
    offroadMul: 0.9,
  },
  {
    id: "cloud",
    name: "わたぐも",
    emoji: "☁️",
    tag: "加速・ふわふわ",
    desc: "ふわふわの大きなタイヤ。出足が速くて軽い",
    color: 0xefe6d2,
    rim: 0x8aa4b8,
    radius: 0.36,
    width: 0.28,
    segments: 22,
    maxSpeed: -1.6,
    accel: 2.8,
    handling: 0.16,
    weight: -0.14,
    offroadMul: 0.7,
  },
  {
    id: "spike",
    name: "いがぐり",
    emoji: "✳️",
    tag: "スピード・とげ",
    desc: "とげつき。最高速が伸びる。曲がりはにぶめ",
    color: 0x24180f,
    rim: 0x7a3e12,
    radius: 0.28,
    width: 0.22,
    segments: 20,
    maxSpeed: 1.7,
    accel: -0.9,
    handling: -0.22,
    weight: 0.12,
    offroadMul: 0.68,
    driftBonus: 1.18,
  },
];

const CPU_KITS = {
  beetle: { bodyId: "acorn", tireId: "dirt" },
  ladybug: { bodyId: "leaf", tireId: "slick" },
  bee: { bodyId: "honey", tireId: "cloud" },
  hopper: { bodyId: "stream", tireId: "spike" },
};

const GARAGE_KEY = "mushi-kart-garage";
const LAST_RUN_KEY = "mushi-kart-last-run";

export function getBody(id) {
  return BODIES.find((b) => b.id === id) ?? BODIES[0];
}

export function getTire(id) {
  return TIRES.find((t) => t.id === id) ?? TIRES[0];
}

export function cpuKit(charId) {
  return CPU_KITS[charId] ?? { bodyId: "leaf", tireId: "slick" };
}

export function buildLoadout(charId, bodyId, tireId) {
  const c = getCharacter(charId);
  const b = getBody(bodyId);
  const t = getTire(tireId);
  return {
    ...c,
    bodyId: b.id,
    tireId: t.id,
    bodyName: b.name,
    tireName: t.name,
    maxSpeed: c.maxSpeed + b.maxSpeed + t.maxSpeed,
    accel: c.accel + b.accel + t.accel,
    handling: c.handling + b.handling + t.handling,
    weight: Math.max(0.5, c.weight + b.weight + t.weight),
    driftBonus: (c.driftBonus || 1) * (b.driftBonus || 1) * (t.driftBonus || 1),
    offroadMul: t.offroadMul ?? 0.72,
  };
}

function pct(v, min, max) {
  return Math.max(0, Math.min(100, Math.round(((v - min) / (max - min)) * 100)));
}

export function statBars(loadout) {
  return [
    { name: "スピード", value: pct(loadout.maxSpeed, 22, 33) },
    { name: "加速", value: pct(loadout.accel, 12, 28) },
    { name: "曲がり", value: pct(loadout.handling, 1.25, 3.15) },
    { name: "重さ", value: pct(loadout.weight, 0.5, 1.8) },
  ];
}

const COURSE_IDS = ["garden", "sea", "volcano"];

function validCourse(id) {
  return COURSE_IDS.includes(id) ? id : "garden";
}

export function defaultGarage() {
  return { charId: CHARACTERS[0].id, bodyId: "leaf", tireId: "slick", courseId: "garden" };
}

export function loadGarage() {
  try {
    const raw = JSON.parse(localStorage.getItem(GARAGE_KEY) || "null");
    if (raw && typeof raw === "object") {
      const charId = CHARACTERS.some((c) => c.id === raw.charId) ? raw.charId : CHARACTERS[0].id;
      const bodyId = BODIES.some((b) => b.id === raw.bodyId) ? raw.bodyId : "leaf";
      const tireId = TIRES.some((t) => t.id === raw.tireId) ? raw.tireId : "slick";
      return { charId, bodyId, tireId, courseId: validCourse(raw.courseId) };
    }
  } catch {
    /* ignore */
  }
  return defaultGarage();
}

export function saveGarage(g) {
  localStorage.setItem(GARAGE_KEY, JSON.stringify(g));
}

export function saveLastRun(run) {
  localStorage.setItem(
    LAST_RUN_KEY,
    JSON.stringify({
      mode: run.mode === "time" ? "time" : "cpu",
      charId: run.charId,
      bodyId: run.bodyId,
      tireId: run.tireId,
      courseId: validCourse(run.courseId),
    })
  );
}

export function loadLastRun() {
  try {
    const raw = JSON.parse(localStorage.getItem(LAST_RUN_KEY) || "null");
    if (raw && typeof raw === "object") {
      const charId = CHARACTERS.some((c) => c.id === raw.charId) ? raw.charId : null;
      const bodyId = BODIES.some((b) => b.id === raw.bodyId) ? raw.bodyId : null;
      const tireId = TIRES.some((t) => t.id === raw.tireId) ? raw.tireId : null;
      if (charId && bodyId && tireId) {
        return {
          mode: raw.mode === "time" ? "time" : "cpu",
          charId,
          bodyId,
          tireId,
          courseId: validCourse(raw.courseId),
        };
      }
    }
  } catch {
    /* ignore */
  }
  if (!localStorage.getItem(GARAGE_KEY)) return null;
  const g = loadGarage();
  return { mode: "cpu", ...g };
}
