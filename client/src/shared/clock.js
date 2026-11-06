// Timers follow the server's clock. Each state carries `serverNow`; the offset turns this device's
// time into server time, so a phone with a wrong clock still shows the right seconds.

export function clockOffset(serverNow, receivedAt) {
  return Number.isFinite(serverNow) ? serverNow - receivedAt : 0;
}

export function msLeft(endsAt, offsetMs, now = Date.now()) {
  if (!Number.isFinite(endsAt)) return 0;
  return Math.max(0, endsAt - (now + offsetMs));
}

export function secondsLeft(endsAt, offsetMs, now = Date.now()) {
  return Math.ceil(msLeft(endsAt, offsetMs, now) / 1000);
}

// Share of the time still left, 0–100.
export function percentLeft(startedAt, endsAt, offsetMs, now = Date.now()) {
  const total = endsAt - startedAt;
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.min(100, (msLeft(endsAt, offsetMs, now) / total) * 100);
}
