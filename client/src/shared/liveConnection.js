// The live stream from the server (/events), kept alive on flaky phone networks.
//
// - Any message or heartbeat counts as a sign of life. If nothing arrives for 25 s (the server sends a
//   heartbeat every 10 s), the stream is closed and reopened: a silent drop never leaves a phone stuck.
// - Reconnects wait 1, 2, 4, 8, then 10 s between attempts. After 30 s without a connection the
//   status becomes "lost"; it keeps trying, and retry() tries again at once.
// - When the phone comes back to the foreground, a stale or closed stream is reopened straight away.
//
// Plain logic with no React, so it can be tested with a fake EventSource and fake timers.

export const WATCHDOG_MS = 25000;
export const WATCHDOG_CHECK_MS = 5000;
export const FOREGROUND_STALE_MS = 12000;
export const LOST_AFTER_MS = 30000;
export const BACKOFF_MS = [1000, 2000, 4000, 8000, 10000];

export function backoffDelay(attempt) {
  return BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
}

export function createLiveConnection({
  url,
  onState,
  onStatus,
  EventSourceImpl = globalThis.EventSource,
  timers = globalThis,
  now = () => Date.now(),
  doc = globalThis.document
}) {
  let currentUrl = url;
  let source = null;
  let status = "connecting";
  let lastMessageAt = now();
  let droppedAt = null;
  let attempt = 0;
  let reconnectTimer = null;
  let lostTimer = null;
  let stopped = false;

  function setStatus(next) {
    if (status === next) return;
    status = next;
    onStatus?.(next);
  }

  function alive() {
    lastMessageAt = now();
    droppedAt = null;
    attempt = 0;
    clearLostTimer();
    setStatus("connected");
  }

  function clearLostTimer() {
    if (lostTimer) timers.clearTimeout(lostTimer);
    lostTimer = null;
  }

  // Marks the start of a drop; "lost" follows if no message arrives within LOST_AFTER_MS.
  function startDrop() {
    droppedAt = now();
    clearLostTimer();
    lostTimer = timers.setTimeout(() => {
      lostTimer = null;
      if (!stopped && droppedAt !== null) setStatus("lost");
    }, LOST_AFTER_MS);
  }

  function open() {
    if (stopped) return;
    closeSource();
    lastMessageAt = now();
    const openedUrl = currentUrl;
    const opened = new EventSourceImpl(openedUrl);
    source = opened;
    opened.onmessage = (event) => {
      if (source !== opened) return;
      alive();
      let state;
      try {
        state = JSON.parse(event.data);
      } catch {
        return;
      }
      onState?.(state, { receivedAt: now(), url: openedUrl });
    };
    opened.addEventListener("heartbeat", () => {
      if (source === opened) alive();
    });
    opened.onerror = () => {
      if (source === opened) drop();
    };
  }

  function closeSource() {
    if (!source) return;
    source.onmessage = null;
    source.onerror = null;
    source.close();
    source = null;
  }

  function drop() {
    if (stopped) return;
    closeSource();
    if (droppedAt === null) {
      startDrop();
      setStatus("reconnecting");
    }
    if (reconnectTimer) return;
    reconnectTimer = timers.setTimeout(() => {
      reconnectTimer = null;
      open();
    }, backoffDelay(attempt));
    attempt += 1;
  }

  function reconnectNow() {
    if (stopped) return;
    if (reconnectTimer) timers.clearTimeout(reconnectTimer);
    reconnectTimer = null;
    attempt = 0;
    open();
  }

  function retry() {
    // Tapping Retry shows "Reconnecting…" again while the new attempt runs.
    if (status === "lost") {
      startDrop();
      setStatus("reconnecting");
    }
    reconnectNow();
  }

  const watchdog = timers.setInterval(() => {
    if (stopped || !source) return;
    if (now() - lastMessageAt > WATCHDOG_MS) drop();
  }, WATCHDOG_CHECK_MS);

  function onVisibility() {
    if (doc.visibilityState !== "visible" || stopped) return;
    const closed = !source || source.readyState === 2;
    if (closed || now() - lastMessageAt > FOREGROUND_STALE_MS) reconnectNow();
  }
  doc?.addEventListener?.("visibilitychange", onVisibility);

  open();

  return {
    get status() {
      return status;
    },
    retry,
    // Reopens the stream on a new address (after joining, the stream carries the player's token).
    setUrl(next) {
      if (next === currentUrl) return;
      currentUrl = next;
      reconnectNow();
    },
    close() {
      stopped = true;
      timers.clearInterval(watchdog);
      if (reconnectTimer) timers.clearTimeout(reconnectTimer);
      clearLostTimer();
      doc?.removeEventListener?.("visibilitychange", onVisibility);
      closeSource();
    }
  };
}
