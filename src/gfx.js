import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function std(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.54,
    metalness: 0.05,
    ...extras,
  });
}

export function roundBox(w, h, d, segs = 4, r = Math.min(w, h, d) * 0.2) {
  const radius = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  return new RoundedBoxGeometry(w, h, d, segs, Math.max(0.01, radius));
}
