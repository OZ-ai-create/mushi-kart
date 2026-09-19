export const CHARACTERS = [
  {
    id: "beetle",
    name: "ヘラクレス",
    emoji: "🪲",
    tag: "スピード",
    desc: "まっすぐ速い。重くてぶつかり強い。必殺は角突きで相手を蹴散らす",
    color: 0x2a2410,
    accent: 0xc2a24a,
    maxSpeed: 28.4,
    accel: 15.5,
    handling: 1.72,
    weight: 1.25,
    driftBonus: 1.0,
  },
  {
    id: "ladybug",
    name: "テントウ",
    emoji: "🐞",
    tag: "ハンドリング",
    desc: "曲がり上手。細い道が得意。必殺はてんとう舞いでコースの真ん中へ戻る",
    color: 0xd62828,
    accent: 0x1a120c,
    maxSpeed: 25.6,
    accel: 18.2,
    handling: 2.42,
    weight: 0.82,
    driftBonus: 1.08,
  },
  {
    id: "bee",
    name: "ミツバチ",
    emoji: "🐝",
    tag: "加速",
    desc: "出足が速い。ハチミツと相性よし。必殺はみつばちジェットで一気に加速する",
    color: 0xf4d35e,
    accent: 0x1a120c,
    maxSpeed: 26.6,
    accel: 22.4,
    handling: 2.05,
    weight: 0.9,
    driftBonus: 1.0,
  },
  {
    id: "hopper",
    name: "キリギリス",
    emoji: "🦗",
    tag: "ドリフト",
    desc: "ドリフトチャージが溜まりやすい。必殺は大ジャンプで天敵を飛び越える",
    color: 0x7a9a45,
    accent: 0xc4b07a,
    maxSpeed: 26.2,
    accel: 17.4,
    handling: 2.18,
    weight: 1.0,
    driftBonus: 1.25,
  },
  {
    id: "mantis",
    name: "カマキリ",
    emoji: "🗡️",
    tag: "攻撃",
    desc: "重い攻撃型。直線は速いが出足と曲がりは鈍い。必殺のかまいたちで前方を斬る",
    color: 0x6a9a3a,
    accent: 0xc8d86a,
    maxSpeed: 28.0,
    accel: 13.4,
    handling: 1.68,
    weight: 1.32,
    driftBonus: 0.94,
  },
  {
    id: "stag",
    name: "クワガタ",
    emoji: "🟤",
    tag: "最高速",
    desc: "いちばん直線が速い。出足は重い。必殺の大あごブーストで突っ込んで弾く",
    color: 0x3a2418,
    accent: 0xb08a4a,
    maxSpeed: 29.6,
    accel: 12.6,
    handling: 1.86,
    weight: 1.3,
    driftBonus: 0.9,
  },
  {
    id: "butterfly",
    name: "チョウ",
    emoji: "🦋",
    tag: "曲がり",
    desc: "いちばん曲がりやすい。直線は控えめ。必殺のフラワーターンでドリフトが溜まりやすい",
    color: 0xf2a0c8,
    accent: 0x6ec4e8,
    maxSpeed: 24.4,
    accel: 18.6,
    handling: 2.72,
    weight: 0.56,
    driftBonus: 1.48,
  },
  {
    id: "dragonfly",
    name: "トンボ",
    emoji: "🩵",
    tag: "出足",
    desc: "いちばん出足が速い。軽い。必殺の超加速で一気に最高速へ飛び出す",
    color: 0x2f6f8a,
    accent: 0xc45a3a,
    maxSpeed: 27.2,
    accel: 25.4,
    handling: 2.28,
    weight: 0.7,
    driftBonus: 1.04,
  },
  {
    id: "locust",
    name: "バッタ",
    emoji: "🦘",
    tag: "ジャンプ",
    desc: "ジャンプが高い。障害物と近道が得意。直線は並。必殺のハイジャンプで飛び越える",
    color: 0xc4a24a,
    accent: 0x5a7a32,
    maxSpeed: 26.0,
    accel: 17.8,
    handling: 2.08,
    weight: 0.96,
    driftBonus: 1.06,
    jumpBonus: 1.9,
  },
  {
    id: "ant",
    name: "アリ",
    emoji: "🐜",
    tag: "バランス",
    desc: "どれも平均的で扱いやすい。必殺のアリ軍団で周囲の相手を妨害する",
    color: 0x3a2a22,
    accent: 0xc45a3a,
    maxSpeed: 26.4,
    accel: 18.6,
    handling: 2.12,
    weight: 1.02,
    driftBonus: 1.0,
  },
  {
    id: "cicada",
    name: "セミ",
    emoji: "📢",
    tag: "爆走",
    desc: "復帰が速い。曲がりは普通。必殺の爆音ダッシュで加速しつつ周囲をひるませる",
    color: 0x5a6a3a,
    accent: 0xe8d48a,
    maxSpeed: 26.8,
    accel: 21.2,
    handling: 1.94,
    weight: 0.92,
    driftBonus: 0.98,
  },
  {
    id: "firefly",
    name: "ホタル",
    emoji: "🌟",
    tag: "防御",
    desc: "軽いテクニカル型。最高速は控えめ。必殺の光のベールでアイテム攻撃を無効化する",
    color: 0x1a2418,
    accent: 0xc8e85a,
    maxSpeed: 25.2,
    accel: 19.2,
    handling: 2.34,
    weight: 0.76,
    driftBonus: 1.16,
  },
];

function clampStar(v, min, max) {
  const t = (Number(v) - min) / (max - min);
  return Math.max(1, Math.min(5, Math.round(1 + t * 4)));
}

export function starLine(n) {
  const s = Math.max(0, Math.min(5, n | 0));
  return "★".repeat(s) + "☆".repeat(5 - s);
}

export function charStarStats(c) {
  const rows = [
    { name: "最高速度", n: clampStar(c.maxSpeed, 24.2, 29.8) },
    { name: "加速", n: clampStar(c.accel, 12.4, 25.6) },
    { name: "ハンドリング", n: clampStar(c.handling, 1.62, 2.76) },
    { name: "重量", n: clampStar(c.weight, 0.54, 1.34) },
  ];
  if ((c.jumpBonus || 1) > 1.2) {
    rows.push({ name: "ジャンプ", n: clampStar(c.jumpBonus, 1, 2) });
  }
  return rows;
}

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

export function pickCpuRivals(playerId, n = 3) {
  const others = CHARACTERS.map((c) => c.id).filter((id) => id !== playerId);
  const start = Math.max(0, CHARACTERS.findIndex((c) => c.id === playerId));
  const out = [];
  for (let k = 0; k < n && k < others.length; k++) out.push(others[(start + k) % others.length]);
  return out;
}
