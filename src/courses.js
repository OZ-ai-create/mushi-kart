import * as THREE from "three";

function closedLoop(n, fn) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    pts.push(fn(t, t * Math.PI * 2));
  }
  return pts;
}

function widthProfile(base, pinches, minW = 3.08) {
  return (t) => {
    const u = ((t % 1) + 1) % 1;
    let w = base;
    for (const p of pinches) {
      const d = Math.min(Math.abs(u - p.at), 1 - Math.abs(u - p.at));
      if (d < p.span) {
        const k = 0.5 * (1 + Math.cos((Math.PI * d) / p.span));
        w -= p.cut * k;
      }
    }
    return Math.max(minW, w);
  };
}

export const COURSES = [
  {
    id: "garden",
    name: "朝露ガーデン",
    emoji: "🌿",
    tag: "はなばたけ",
    desc: "長い丘と細い橋。花の脇か、安全な中央か",
    badge: "GARDEN GRAND PRIX",
    laps: 3,
    shortcuts: [
      { t: 0.245, side: -1, minLat: 3.45, skip: 0.026, name: "花だん脇", risk: "offroad" },
      { t: 0.515, side: 1, minLat: 3.35, skip: 0.032, name: "丘の近道", risk: "narrow" },
      { t: 0.83, side: -1, minLat: 3.2, skip: 0.022, name: "葉のトンネル", risk: "bird" },
    ],
    itemStations: [0.07, 0.16, 0.37, 0.61, 0.83],
    boostPads: [0.055, 0.5, 0.96],
    gizmos: [
      { type: "flower", t: 0.12, span: 0.04, side: -1, minLat: 2.1, boost: 0.62, name: "花びら加速" },
      { type: "jump", t: 0.68, span: 0.02, w: 2.4, hop: 0.92, skip: 0.016, name: "葉のジャンプ台" },
      { type: "leaf", t: 0.83, span: 0.03, side: -1, minLat: 2.6, hide: true, name: "葉陰" },
    ],
    halfWidth: 6.05,
    widthAt: widthProfile(6.05, [
      { at: 0.24, span: 0.07, cut: 2.55 },
      { at: 0.51, span: 0.09, cut: 2.9 },
      { at: 0.83, span: 0.065, cut: 2.35 },
    ]),
    clear: 0x9ec9e6,
    fog: 0x9ec9e6,
    ground: 0x4f8f3e,
    dirt: 0x7a9a4a,
    hedge: 0x2f6b32,
    roadA: 0xf4d9a8,
    roadB: 0xe0b07a,
    curbA: [0.86, 0.28, 0.22],
    curbB: [0.96, 0.94, 0.88],
    skyTop: [0.48, 0.74, 0.92],
    skyHor: [0.98, 0.78, 0.52],
    skyGnd: [0.62, 0.78, 0.42],
    hemiSky: 0xfff1d0,
    hemiGnd: 0x5a7a48,
    hemiInt: 1.2,
    sun: 0xfff6e0,
    sunInt: 1.35,
    ambient: 0xfff5e8,
    pollen: 0xfff2b0,
    points() {
      return closedLoop(96, (_t, a) => {
        const x = Math.cos(a) * 72 + Math.cos(a * 2) * 11 + Math.sin(a * 3) * 3.2;
        const z = Math.sin(a) * 52 + Math.sin(a * 3) * 7.2 + Math.cos(a * 2) * 4.1;
        const y = 6.2 + Math.sin(a - 0.35) * 3.7 + Math.sin(a * 2) * 1.65 + Math.cos(a * 3) * 0.45;
        return new THREE.Vector3(x * 1.5, y * 1.12, z * 1.5);
      });
    },
  },
  {
    id: "sea",
    name: "しおさいビーチ",
    emoji: "🌊",
    tag: "うみ",
    desc: "砂丘の坂と細い磯。潮流に乗るか、砂浜を避けるか",
    badge: "SEA GRAND PRIX",
    laps: 3,
    shortcuts: [
      { t: 0.185, side: 1, minLat: 3.55, skip: 0.028, name: "砂丘ショート", risk: "sand" },
      { t: 0.42, side: -1, minLat: 2.8, skip: 0.02, name: "潮の道", risk: "current" },
      { t: 0.715, side: -1, minLat: 3.65, skip: 0.03, name: "磯の近道", risk: "fish" },
    ],
    itemStations: [0.1, 0.28, 0.52, 0.78],
    boostPads: [0.08, 0.48, 0.94],
    gizmos: [
      { type: "current", t: 0.4, span: 0.085, side: -1, minLat: 1.15, pull: 11, name: "潮流" },
      { type: "sand", t: 0.62, span: 0.07, side: 1, minLat: 2.15, drag: 0.72, name: "砂浜" },
      { type: "wave", t: 0.88, span: 0.04, hop: 0.42, name: "波しぶき" },
    ],
    halfWidth: 6.35,
    widthAt: widthProfile(6.35, [
      { at: 0.18, span: 0.06, cut: 2.4 },
      { at: 0.42, span: 0.08, cut: 3.05 },
      { at: 0.71, span: 0.07, cut: 2.5 },
    ]),
    clear: 0x6eb6d4,
    fog: 0x6eb6d4,
    ground: 0xe6d2a4,
    dirt: 0xcbb887,
    hedge: 0x2e8f9a,
    roadA: 0xf3e2b8,
    roadB: 0xcde8ef,
    curbA: [0.22, 0.55, 0.72],
    curbB: [0.95, 0.9, 0.78],
    skyTop: [0.32, 0.62, 0.88],
    skyHor: [0.95, 0.82, 0.58],
    skyGnd: [0.72, 0.86, 0.78],
    hemiSky: 0xd8f0ff,
    hemiGnd: 0x6a8a70,
    hemiInt: 1.15,
    sun: 0xfff4d2,
    sunInt: 1.4,
    ambient: 0xe8f6ff,
    pollen: 0xe8f6ff,
    points() {
      return closedLoop(96, (_t, a) => {
        const x = Math.cos(a) * 80 + Math.cos(a * 2) * 9.5 + Math.sin(a * 4) * 2.2;
        const z = Math.sin(a) * 50 + Math.sin(a * 2) * 6.4 + Math.cos(a * 3) * 3.1;
        const dune = Math.pow(Math.max(0, Math.sin(a - 0.2)), 1.35);
        const y = 0.55 + dune * 4.2 + Math.sin(a * 3) * 0.28;
        return new THREE.Vector3(x * 1.5, y * 1.12, z * 1.5);
      });
    },
  },
  {
    id: "volcano",
    name: "かざんボルケーノ",
    emoji: "🌋",
    tag: "かざん",
    desc: "尾根の細い道と急な坂。溶岩ショートは速いが燃える",
    badge: "VOLCANO GRAND PRIX",
    laps: 3,
    shortcuts: [
      { t: 0.305, side: -1, minLat: 3.15, skip: 0.025, name: "火口脇", risk: "lava" },
      { t: 0.52, side: -1, minLat: 2.9, skip: 0.028, name: "溶岩スキップ", risk: "burn" },
      { t: 0.885, side: 1, minLat: 3.2, skip: 0.03, name: "尾根の近道", risk: "flame" },
    ],
    itemStations: [0.12, 0.33, 0.58, 0.86],
    boostPads: [0.2, 0.64, 0.97],
    gizmos: [
      { type: "boost", t: 0.2, span: 0.028, w: 2.6, boost: 1.28, name: "噴気加速" },
      { type: "lava", t: 0.52, span: 0.05, side: -1, minLat: 2.55, skip: 0.024, name: "溶岩ショート" },
      { type: "ember", t: 0.74, span: 0.045, w: 2.8, name: "火山弾" },
    ],
    halfWidth: 5.65,
    widthAt: widthProfile(5.65, [
      { at: 0.3, span: 0.075, cut: 2.35 },
      { at: 0.52, span: 0.09, cut: 2.55 },
      { at: 0.88, span: 0.06, cut: 2.2 },
    ]),
    clear: 0xc45c3a,
    fog: 0xb85a38,
    ground: 0x3a2422,
    dirt: 0x5a3328,
    hedge: 0x5c2218,
    roadA: 0x5a4a46,
    roadB: 0x8a4a32,
    curbA: [0.92, 0.38, 0.16],
    curbB: [0.22, 0.16, 0.14],
    skyTop: [0.28, 0.16, 0.18],
    skyHor: [0.92, 0.42, 0.22],
    skyGnd: [0.22, 0.12, 0.1],
    hemiSky: 0xffc090,
    hemiGnd: 0x4a2018,
    hemiInt: 1.05,
    sun: 0xff8a4a,
    sunInt: 1.2,
    ambient: 0xffd0b0,
    pollen: 0xff7a3a,
    points() {
      return closedLoop(96, (_t, a) => {
        const x = Math.cos(a) * 70 + Math.sin(a * 2) * 9.2 + Math.cos(a * 3) * 2.4;
        const z = Math.sin(a) * 64 + Math.cos(a * 3) * 6.2 + Math.sin(a * 2) * 3.4;
        const climb = 0.5 + 0.5 * Math.sin(a);
        const y = 2.35 + climb * 6.1 + Math.sin(a * 2) * 1.55;
        return new THREE.Vector3(x * 1.5, y * 1.12, z * 1.5);
      });
    },
  },
];

export function getCourse(id) {
  return COURSES.find((c) => c.id === id) ?? COURSES[0];
}
