/** Race session options. Kept separate from rendering so online rooms can reuse later. */

export const DIFFICULTIES = [
  { id: "easy", name: "やさしい", speedMul: 0.9, itemDelay: 3.4, cutChance: 0.28, rocket: 0.2, react: 0.72 },
  { id: "normal", name: "ふつう", speedMul: 1, itemDelay: 2.15, cutChance: 0.58, rocket: 0.42, react: 1 },
  { id: "hard", name: "きびしい", speedMul: 1.07, itemDelay: 1.12, cutChance: 0.88, rocket: 0.72, react: 1.28 },
];

const DIFF_KEY = "mushi-kart-diff";

export function getDifficulty(id) {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}

export function loadDifficulty() {
  try {
    const id = localStorage.getItem(DIFF_KEY);
    if (DIFFICULTIES.some((d) => d.id === id)) return id;
  } catch {
    /* ignore */
  }
  return "normal";
}

export function saveDifficulty(id) {
  const d = getDifficulty(id);
  localStorage.setItem(DIFF_KEY, d.id);
  return d.id;
}

export function inviteUrl({ courseId = "garden", mode = "cpu", difficulty = "normal" } = {}) {
  const u = new URL(location.href);
  u.search = "";
  u.searchParams.set("c", courseId);
  u.searchParams.set("m", mode === "time" ? "time" : "cpu");
  u.searchParams.set("d", getDifficulty(difficulty).id);
  return u.toString();
}

export function parseInvite(search = location.search) {
  const q = new URLSearchParams(search);
  const courseId = ["garden", "sea", "volcano"].includes(q.get("c")) ? q.get("c") : null;
  const mode = q.get("m") === "time" || q.get("m") === "cpu" ? q.get("m") : null;
  const difficulty = DIFFICULTIES.some((d) => d.id === q.get("d")) ? q.get("d") : null;
  return { courseId, mode, difficulty };
}

export function raceConfig({
  playerId,
  mode = "cpu",
  courseId = "garden",
  bodyId = "leaf",
  tireId = "slick",
  accId = "none",
  difficulty = "normal",
} = {}) {
  return {
    playerId,
    mode: mode === "time" ? "time" : "cpu",
    courseId,
    garage: { bodyId, tireId, accId },
    difficulty: getDifficulty(difficulty).id,
  };
}
