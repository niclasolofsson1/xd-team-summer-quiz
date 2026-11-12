// Host requests. Every host action carries the PIN; the server checks it again each time.
// Host actions are sent once, never retried automatically: a silent retry of "final-reveal" could
// skip a podium stage. A failure is shown to the host, who can press again.
import { postJson } from "../shared/api.js";

export const OFFLINE_MESSAGE = "Couldn't reach the quiz server. Try again.";

// { ok, status, data, message }. status 403 = the PIN is missing or wrong.
export async function hostAction(action, pin, body = {}, options = {}) {
  try {
    const { status, data } = await postJson(action, { ...body, hostPin: pin || "" }, options);
    const ok = status < 400 && data.ok !== false;
    return { ok, status, data, message: ok ? "" : data.message || "Something went wrong. Try again." };
  } catch {
    return { ok: false, status: 0, data: {}, message: OFFLINE_MESSAGE };
  }
}

export async function getJson(path, { fetchImpl = globalThis.fetch } = {}) {
  const res = await fetchImpl(path, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}
