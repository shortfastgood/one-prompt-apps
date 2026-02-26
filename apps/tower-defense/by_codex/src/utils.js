export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distanceSq(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function distance(a, b) {
  return Math.sqrt(distanceSq(a, b));
}

export function pointToSegmentDistance(point, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = point.x - a.x;
  const apy = point.y - a.y;
  const abLenSq = abx * abx + aby * aby;

  if (abLenSq === 0) {
    return distance(point, a);
  }

  const t = clamp((apx * abx + apy * aby) / abLenSq, 0, 1);
  const closest = { x: a.x + abx * t, y: a.y + aby * t };
  return distance(point, closest);
}

export function formatMoney(amount) {
  return `$${Math.floor(amount)}`;
}

export function formatRate(cooldownSeconds) {
  if (!cooldownSeconds || cooldownSeconds <= 0) {
    return "-";
  }
  return `${(1 / cooldownSeconds).toFixed(1)}/s`;
}

export function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

