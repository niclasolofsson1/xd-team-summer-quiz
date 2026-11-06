// POST to the quiz server. Network errors, timeouts and server errors (5xx) are retried;
// a 4xx is the server's answer and is returned as is.

export const RETRY_DELAYS_MS = [500, 1000, 2000];
export const REQUEST_TIMEOUT_MS = 5000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function postJson(action, body, { fetchImpl = globalThis.fetch, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`/api/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

// Returns { ok, status, data } from the first attempt that got a real answer, or
// { ok: false, status: 0 } when every attempt failed (1 try + up to 3 retries).
export async function postWithRetry(action, body, { delays = RETRY_DELAYS_MS, sleep = wait, ...options } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const { status, data } = await postJson(action, body, options);
      if (status < 500) return { ok: status < 400 && data.ok !== false, status, data };
    } catch {
      // Network error or timeout: try again below.
    }
    if (attempt >= delays.length) return { ok: false, status: 0, data: {} };
    await sleep(delays[attempt]);
  }
}
