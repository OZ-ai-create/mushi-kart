const PROFILE_KEY = "mushi-kart-profile";
const GHOST_KEY = "mushi-kart-ghosts";

export const UNLOCKS = {
  bodies: {
    leaf: { coins: 0 },
    honey: { coins: 0 },
    acorn: { coins: 18, hint: "重いスピードボディ" },
    stream: { coins: 45, hint: "速い花びらボディ" },
  },
  tires: {
    slick: { coins: 0 },
    dirt: { coins: 12, hint: "芝でも減速しにくい" },
    cloud: { coins: 28, hint: "出足が速い" },
    spike: { coins: 55, hint: "ドリフト向き" },
  },
  accessories: {
    none: { coins: 0 },
    flag: { coins: 16, hint: "曲がりが少し良くなる" },
    lantern: { coins: 32, hint: "芝の外でも減速しにくい" },
    wing: { coins: 50, hint: "出足とドリフト向き" },
  },
};

export const ACHIEVEMENTS = [
  { id: "first-run", name: "はじめてのレース", desc: "1回ゴールする", coins: 5, check: (s) => s.finished },
  { id: "first-win", name: "初勝利", desc: "CPU対戦で1位", coins: 12, check: (s) => s.mode === "cpu" && s.place === 1 },
  { id: "perfect-start", name: "完璧な飛び出し", desc: "ロケットスタート成功", coins: 8, check: (s) => s.rocket === "good" || s.rocket === "perfect" },
  { id: "turbo-3", name: "ドリフトマスター", desc: "1レースでターボ3回", coins: 8, check: (s) => (s.turbos || 0) >= 3 },
  { id: "cut-2", name: "ショートカット職人", desc: "近道を2回成功", coins: 8, check: (s) => (s.shortcuts || 0) >= 2 },
  { id: "coin-12", name: "ハチミツ貯金", desc: "1レースでコイン12枚", coins: 6, check: (s) => (s.coins || 0) >= 12 },
  { id: "ghost-beat", name: "過去の自分に勝つ", desc: "タイムアタックで自己ベスト更新", coins: 10, check: (s) => s.mode === "time" && s.bestUpdate },
  { id: "streak-3", name: "三日走り", desc: "3日連続で遊ぶ", coins: 10, check: (_s, p) => (p.streak || 0) >= 3 },
  { id: "item-ace", name: "アイテムマスター", desc: "アイテムを4回使い2回当てる", coins: 8, check: (s) => (s.itemsUsed || 0) >= 4 && (s.itemsHit || 0) >= 2 },
  { id: "races-10", name: "常連むし", desc: "レース10回", coins: 12, check: (_s, p) => (p.runs || 0) >= 10 },
  { id: "races-100", name: "100レース", desc: "レース100回", coins: 40, check: (_s, p) => (p.runs || 0) >= 100 },
  { id: "all-chars", name: "全キャラクター制覇", desc: "4匹すべてで完走する", coins: 18, check: (_s, p) => Object.keys(p.chars || {}).length >= 4 },
];

export const TITLES = [
  { id: "rookie", name: "むし見習い", need: [] },
  { id: "racer", name: "花園レーサー", need: ["first-run"] },
  { id: "winner", name: "優勝むし", need: ["first-win"] },
  { id: "drift", name: "ドリフト名人", need: ["turbo-3", "perfect-start"] },
  { id: "scout", name: "近道使い", need: ["cut-2"] },
  { id: "champ", name: "むしチャンプ", need: ["first-win", "ghost-beat", "streak-3"] },
];

const DAILY_POOL = [
  { id: "d-garden-ta", desc: "朝露ガーデンでタイムアタック", course: "garden", mode: "time", reward: 10 },
  { id: "d-cpu-2", desc: "CPU対戦で2位以内", mode: "cpu", maxPlace: 2, reward: 10 },
  { id: "d-rocket", desc: "ロケットスタートを決める", rocket: "good", reward: 8 },
  { id: "d-cut", desc: "近道を1回成功させる", shortcuts: 1, reward: 8 },
  { id: "d-coins", desc: "コインを8枚集める", coins: 8, reward: 8 },
  { id: "d-turbo", desc: "ミニターボを3回決める", turbos: 3, reward: 8 },
  { id: "d-sea", desc: "しおさいビーチを走る", course: "sea", reward: 8 },
  { id: "d-volcano", desc: "かざんボルケーノを走る", course: "volcano", reward: 8 },
  { id: "d-drift", desc: "ドリフトを8回決める", drifts: 8, reward: 8 },
  { id: "d-win", desc: "CPU対戦で1位をとる", mode: "cpu", maxPlace: 1, reward: 12 },
];

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

export function dailyFor(dateKey = todayKey()) {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) h = Math.imul(h ^ dateKey.charCodeAt(i), 16777619);
  return DAILY_POOL[Math.abs(h) % DAILY_POOL.length];
}

export function emptyProfile() {
  return {
    coins: 0,
    runs: 0,
    bestCoins: 0,
    unlocked: { bodies: ["leaf", "honey"], tires: ["slick"], accessories: ["none"] },
    achs: {},
    streak: 0,
    day: null,
    streakAwarded: null,
    dailyDone: {},
    titleId: "rookie",
    lastRun: null,
    tutorialDone: false,
    chars: {},
    charBest: {},
  };
}

export function loadProfile() {
  const base = emptyProfile();
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    if (!raw || typeof raw !== "object") return base;
    return {
      ...base,
      ...raw,
      unlocked: {
        bodies: Array.isArray(raw.unlocked?.bodies) ? raw.unlocked.bodies : base.unlocked.bodies,
        tires: Array.isArray(raw.unlocked?.tires) ? raw.unlocked.tires : base.unlocked.tires,
        accessories: Array.isArray(raw.unlocked?.accessories) ? raw.unlocked.accessories : base.unlocked.accessories,
      },
      chars: raw.chars && typeof raw.chars === "object" ? raw.chars : {},
      charBest: raw.charBest && typeof raw.charBest === "object" ? raw.charBest : {},
      achs: raw.achs && typeof raw.achs === "object" ? raw.achs : {},
      dailyDone: raw.dailyDone && typeof raw.dailyDone === "object" ? raw.dailyDone : {},
    };
  } catch {
    return base;
  }
}

export function saveProfile(p) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

export function isUnlocked(profile, kind, id) {
  const cost = UNLOCKS[kind]?.[id]?.coins ?? 0;
  if (cost <= 0) return true;
  return (profile.unlocked?.[kind] || []).includes(id);
}

export function unlockCost(kind, id) {
  return UNLOCKS[kind]?.[id]?.coins ?? 0;
}

export function tryUnlock(profile, kind, id) {
  if (isUnlocked(profile, kind, id)) return { ok: true, profile };
  const cost = unlockCost(kind, id);
  if ((profile.coins || 0) < cost) return { ok: false, need: cost, profile };
  profile.coins -= cost;
  if (!profile.unlocked[kind]) profile.unlocked[kind] = [];
  if (!profile.unlocked[kind].includes(id)) profile.unlocked[kind].push(id);
  saveProfile(profile);
  return { ok: true, profile };
}

export function currentTitle(profile) {
  let best = TITLES[0];
  for (const t of TITLES) {
    if (t.need.every((id) => profile.achs?.[id])) best = t;
  }
  return best;
}

function dailyMatches(daily, s) {
  if (daily.course && s.courseId !== daily.course) return false;
  if (daily.mode && s.mode !== daily.mode) return false;
  if (daily.maxPlace && !(s.finished && s.place <= daily.maxPlace)) return false;
  if (daily.rocket) {
    if (daily.rocket === "good") {
      if (s.rocket !== "good" && s.rocket !== "perfect") return false;
    } else if (s.rocket !== daily.rocket) return false;
  }
  if (daily.shortcuts && (s.shortcuts || 0) < daily.shortcuts) return false;
  if (daily.coins && (s.coins || 0) < daily.coins) return false;
  if (daily.turbos && (s.turbos || 0) < daily.turbos) return false;
  if (daily.drifts && (s.drifts || 0) < daily.drifts) return false;
  return true;
}

export function touchStreak(profile) {
  const today = todayKey();
  if (profile.day === today) return profile;
  if (profile.day === yesterdayKey()) profile.streak = (profile.streak || 0) + 1;
  else profile.streak = 1;
  profile.day = today;
  return profile;
}

export function applyRace(profile, summary) {
  profile = touchStreak(profile);
  const today = todayKey();
  let earned = summary.coins || 0;
  const notes = [];
  const newAchs = [];
  const unlockedTitle = [];

  profile.runs = (profile.runs || 0) + 1;
  profile.bestCoins = Math.max(profile.bestCoins || 0, summary.coins || 0);
  profile.coins = (profile.coins || 0) + earned;
  if (summary.charId) {
    if (!profile.chars) profile.chars = {};
    profile.chars[summary.charId] = (profile.chars[summary.charId] || 0) + 1;
  }
  if (summary.finished && summary.time != null && summary.charId && summary.courseId) {
    recordCharBest(profile, summary);
  }

  if (profile.streakAwarded !== today) {
    const bonus = Math.min(8, Math.max(0, (profile.streak || 1) - 1));
    if (bonus > 0) {
      profile.coins += bonus;
      earned += bonus;
      notes.push(`連続${profile.streak}日 +${bonus}コイン`);
    }
    profile.streakAwarded = today;
  }

  const daily = dailyFor(today);
  if (!profile.dailyDone[today] && dailyMatches(daily, summary)) {
    profile.dailyDone[today] = daily.id;
    profile.coins += daily.reward;
    earned += daily.reward;
    notes.push(`今日の課題クリア +${daily.reward}コイン`);
  }

  for (const ach of ACHIEVEMENTS) {
    if (profile.achs[ach.id]) continue;
    if (!ach.check(summary, profile)) continue;
    profile.achs[ach.id] = Date.now();
    profile.coins += ach.coins;
    earned += ach.coins;
    newAchs.push(ach);
    notes.push(`実績「${ach.name}」+${ach.coins}コイン`);
  }

  const before = profile.titleId;
  const title = currentTitle(profile);
  profile.titleId = title.id;
  if (title.id !== before && title.id !== "rookie") unlockedTitle.push(title);

  profile.lastRun = {
    mode: summary.mode,
    courseId: summary.courseId,
    time: summary.time ?? null,
    place: summary.place ?? null,
    coins: summary.coins || 0,
    at: Date.now(),
  };
  saveProfile(profile);
  return { profile, earned, notes, newAchs, title, unlockedTitle, daily };
}

export function compareLast(profile, summary) {
  const last = profile.lastRun;
  if (!last || last.courseId !== summary.courseId || last.mode !== summary.mode) return null;
  if (summary.time == null || last.time == null) return null;
  return last.time - summary.time;
}

export function loadGhosts() {
  try {
    const raw = JSON.parse(localStorage.getItem(GHOST_KEY) || "null");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function loadGhost(courseId) {
  const all = loadGhosts();
  const g = all[courseId];
  if (!g || !Array.isArray(g.samples) || g.samples.length < 8) return null;
  return g;
}

export function saveGhost(courseId, payload) {
  if (!payload?.samples?.length) return;
  const all = loadGhosts();
  all[courseId] = {
    time: payload.time,
    charId: payload.charId,
    bodyId: payload.bodyId,
    tireId: payload.tireId,
    samples: payload.samples.slice(0, 2400),
  };
  localStorage.setItem(GHOST_KEY, JSON.stringify(all));
}

export function recordCharBest(profile, summary) {
  if (summary.time == null || !summary.charId || !summary.courseId) return false;
  if (!profile.charBest) profile.charBest = {};
  if (!profile.charBest[summary.courseId]) profile.charBest[summary.courseId] = {};
  const key = `${summary.mode === "time" ? "time" : "cpu"}:${summary.charId}`;
  const prev = profile.charBest[summary.courseId][key];
  if (prev && prev.time <= summary.time) return false;
  profile.charBest[summary.courseId][key] = { time: summary.time, at: Date.now(), place: summary.place ?? null };
  return true;
}

export function shareText(summary, course) {
  const lines = ["🐞 むしカート", ""];
  if (summary.mode === "cpu" && summary.place) lines.push(`🏆 ${summary.place}位`);
  lines.push(`🏁 ${course.emoji} ${course.name}`);
  if (summary.time != null) {
    const m = Math.floor(summary.time / 60);
    const s = summary.time - m * 60;
    lines.push(`⏱ ${m}:${s.toFixed(2).padStart(5, "0")}`);
  }
  lines.push(`🪙 ${summary.coins || 0}コイン`);
  if (summary.bestUpdate) lines.push("🚀 ベスト更新！");
  else if (summary.delta != null && summary.delta > 0) lines.push(`📈 前回より ${summary.delta.toFixed(2)}秒速い`);
  return lines.join("\n");
}
