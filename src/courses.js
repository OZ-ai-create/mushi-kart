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
    desc: "長い丘と細い橋。鳥に気をつけて",
    badge: "GARDEN GRAND PRIX",
    laps: 3,
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
        return new THREE.Vector3(x, y, z);
      });
    },
  },
  {
    id: "sea",
    name: "しおさいビーチ",
    emoji: "🌊",
    tag: "うみ",
    desc: "砂丘の坂と細い磯。魚が横切るよ",
    badge: "SEA GRAND PRIX",
    laps: 3,
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
        return new THREE.Vector3(x, y, z);
      });
    },
  },
  {
    id: "volcano",
    name: "かざんボルケーノ",
    emoji: "🌋",
    tag: "かざん",
    desc: "尾根の細い道と急な坂。炎に気をつけて",
    badge: "VOLCANO GRAND PRIX",
    laps: 3,
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
        return new THREE.Vector3(x, y, z);
      });
    },
  },
];

export function getCourse(id) {
  return COURSES.find((c) => c.id === id) ?? COURSES[0];
}
