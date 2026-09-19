export const SPECIALS = {
  beetle: {
    id: "horn",
    name: "角突き",
    icon: "💥",
    banner: "角突き！",
    desc: "近くの相手を角で蹴散らす",
  },
  ladybug: {
    id: "lucky",
    name: "てんとう舞い",
    icon: "✨",
    banner: "てんとう舞い！",
    desc: "コースの真ん中へ戻って、曲がりやすくなる",
  },
  bee: {
    id: "jet",
    name: "みつばちジェット",
    icon: "🚀",
    banner: "みつばちジェット！",
    desc: "一気に加速して、うしろにハチミツを残す",
  },
  hopper: {
    id: "leap",
    name: "大ジャンプ",
    icon: "⬆️",
    banner: "大ジャンプ！",
    desc: "大きく跳んで天敵を飛び越える",
  },
  mantis: {
    id: "slash",
    name: "かまいたち",
    icon: "⚔️",
    banner: "かまいたち！",
    desc: "前方に斬撃を飛ばし、当たった相手をスピンさせる",
  },
  stag: {
    id: "jaws",
    name: "大あごブースト",
    icon: "🪵",
    banner: "大あごブースト！",
    desc: "短時間、大幅加速しながら体当たりで弾き飛ばす",
  },
  butterfly: {
    id: "bloom",
    name: "フラワーターン",
    icon: "🌸",
    banner: "フラワーターン！",
    desc: "一定時間、曲がりとドリフトが大幅に強くなる",
  },
  dragonfly: {
    id: "dart",
    name: "超加速",
    icon: "💨",
    banner: "超加速！",
    desc: "短時間で一気に最高速度まで加速する",
  },
  locust: {
    id: "highjump",
    name: "ハイジャンプ",
    icon: "⬆️",
    banner: "ハイジャンプ！",
    desc: "大ジャンプして障害物や一部の近道を飛び越える",
  },
  ant: {
    id: "swarm",
    name: "アリ軍団",
    icon: "🐜",
    banner: "アリ軍団！",
    desc: "周囲にアリを出して、触れた相手を妨害する",
  },
  cicada: {
    id: "sonic",
    name: "爆音ダッシュ",
    icon: "📢",
    banner: "爆音ダッシュ！",
    desc: "一気に加速して、近くの相手をひるませる",
  },
  firefly: {
    id: "veil",
    name: "光のベール",
    icon: "🌟",
    banner: "光のベール！",
    desc: "一定時間、相手のアイテム攻撃を無効化する",
  },
};

export function getSpecial(charId) {
  return SPECIALS[charId] || SPECIALS.beetle;
}

export function canUseSpecial(kart) {
  return !!(kart && !kart.specialUsed && !kart.finished && kart.stun <= 0);
}

export function activateSpecial(kart, ctx) {
  if (!canUseSpecial(kart)) return null;
  const spec = getSpecial(kart.stats.id);
  kart.specialUsed = true;
  kart._ramHit = new Set();
  if (spec.id === "horn") {
    kart.ramT = 1.55;
    kart.boost = Math.max(kart.boost, 1.4);
    kart.speed = Math.max(kart.speed, kart.stats.maxSpeed * 1.08);
    kart.shield = Math.max(kart.shield, 1.55);
  } else if (spec.id === "lucky") {
    kart.luckyT = 2.8;
    kart.ghostT = 2.2;
    kart.lateral = 0;
    kart.boost = Math.max(kart.boost, 0.7);
    ctx.track && kart.snapToTrack(ctx.track);
  } else if (spec.id === "jet") {
    kart.boost = Math.max(kart.boost, 2.45);
    kart.speed = Math.max(kart.speed, kart.stats.maxSpeed * 1.12);
    ctx.items?.honeyTrail?.(kart);
  } else if (spec.id === "leap") {
    kart.leapT = 1.15;
    kart.leapMax = 1.15;
    kart.hop = 1;
  } else if (spec.id === "slash") {
    kart.boost = Math.max(kart.boost, 0.55);
    ctx.items?.slashWave?.(kart);
  } else if (spec.id === "jaws") {
    kart.ramT = 1.45;
    kart.boost = Math.max(kart.boost, 2.15);
    kart.speed = Math.max(kart.speed, kart.stats.maxSpeed * 1.16);
    kart.shield = Math.max(kart.shield, 1.15);
  } else if (spec.id === "bloom") {
    kart.flowerT = 4.2;
    kart.luckyT = Math.max(kart.luckyT, 0.8);
    kart.boost = Math.max(kart.boost, 0.35);
  } else if (spec.id === "dart") {
    kart.boost = Math.max(kart.boost, 1.85);
    kart.speed = Math.max(kart.speed, kart.stats.maxSpeed * 1.22);
    kart.ghostT = Math.max(kart.ghostT, 0.45);
  } else if (spec.id === "highjump") {
    kart.leapT = 1.42;
    kart.leapMax = 1.42;
    kart.hop = 1;
  } else if (spec.id === "swarm") {
    ctx.items?.swarmRing?.(kart);
  } else if (spec.id === "sonic") {
    kart.boost = Math.max(kart.boost, 2.2);
    kart.speed = Math.max(kart.speed, kart.stats.maxSpeed * 1.14);
    kart.boostBurst = true;
    ctx.items?.sonicBurst?.(kart, ctx.karts || [], ctx.audio);
  } else if (spec.id === "veil") {
    kart.shield = Math.max(kart.shield, 5.2);
    kart.ghostT = Math.max(kart.ghostT, 5.2);
  }
  ctx.audio?.special?.();
  return spec;
}

export function aiWantsSpecial(kart, karts, obstacles, track) {
  if (!canUseSpecial(kart) || kart.progress < 0.22) return false;
  const spec = getSpecial(kart.stats.id);
  if (spec.id === "horn" || spec.id === "jaws") {
    return karts.some(
      (o) => o !== kart && !o.finished && o.pos.distanceTo(kart.pos) < 3.5 && kart.speed > 9
    );
  }
  if (spec.id === "lucky") {
    const hw = track.halfWidthAt(kart.t);
    return kart.offroad || Math.abs(kart.lateral) > hw * 0.6 || kart.place > 2;
  }
  if (spec.id === "bloom") {
    return kart.drifting || kart.place > 2 || kart.offroad;
  }
  if (spec.id === "jet" || spec.id === "dart" || spec.id === "sonic") {
    return kart.place >= 2 && kart.progress > 0.4;
  }
  if (spec.id === "leap" || spec.id === "highjump") {
    for (const o of obstacles) {
      let ahead = o.t - kart.t;
      ahead = ((ahead % 1) + 1) % 1;
      const dist = ahead * track.length;
      if (dist > 0.8 && dist < 11) return true;
    }
    return kart.place >= 3 && kart.progress > 0.5;
  }
  if (spec.id === "slash") {
    return karts.some(
      (o) =>
        o !== kart &&
        !o.finished &&
        o.progress > kart.progress - 0.02 &&
        o.pos.distanceTo(kart.pos) < 8.5 &&
        kart.speed > 8
    );
  }
  if (spec.id === "swarm") {
    return karts.some((o) => o !== kart && !o.finished && o.pos.distanceTo(kart.pos) < 6) && kart.progress > 0.35;
  }
  if (spec.id === "veil") {
    return kart.place === 1 && kart.progress > 0.28;
  }
  return false;
}

export function applyRamHits(karts, audio) {
  for (const k of karts) {
    if (k.ramT <= 0 || k.finished) continue;
    if (!k._ramHit) k._ramHit = new Set();
    for (const o of karts) {
      if (o === k || o.finished || o.ghostT > 0 || o.leapT > 0) continue;
      if (k._ramHit.has(o)) continue;
      if (k.pos.distanceToSquared(o.pos) > 16) continue;
      const away = Math.sign(o.lateral - k.lateral) || (Math.random() < 0.5 ? 1 : -1);
      o.lateral += away * 2.6;
      o.stun = Math.max(o.stun, 1.28);
      o.speed *= 0.16;
      o.boost = 0;
      o.hitFlash = 0.75;
      k._ramHit.add(o);
      audio?.hit?.();
    }
  }
}

export function isPhasing(kart) {
  return !!(kart.ramT > 0 || kart.ghostT > 0 || kart.leapT > 0);
}
