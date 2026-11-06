import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createLiveConnection } from "../../client/src/shared/liveConnection.js";

// A stand-in for the browser's EventSource that the test drives by hand.
class FakeEventSource {
  static instances = [];
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.closed = false;
    this.listeners = {};
    FakeEventSource.instances.push(this);
  }
  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }
  close() {
    this.closed = true;
    this.readyState = 2;
  }
  message(state) {
    this.readyState = 1;
    this.onmessage?.({ data: JSON.stringify(state) });
  }
  heartbeat() {
    for (const fn of this.listeners.heartbeat || []) fn({});
  }
  fail() {
    this.onerror?.({});
  }
}

const latest = () => FakeEventSource.instances.at(-1);

function setup(url = "/events") {
  const states = [];
  const statuses = [];
  const doc = new EventTarget();
  doc.visibilityState = "visible";
  const conn = createLiveConnection({
    url,
    EventSourceImpl: FakeEventSource,
    onState: (state, meta) => states.push({ state, meta }),
    onStatus: (status) => statuses.push(status),
    doc
  });
  return { conn, states, statuses, doc };
}

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("live connection", () => {
  test("a message delivers the state and marks the connection as connected", () => {
    const { conn, states, statuses } = setup("/events?token=abc");
    latest().message({ phase: "lobby" });
    expect(states[0].state.phase).toBe("lobby");
    expect(states[0].meta.url).toBe("/events?token=abc");
    expect(statuses).toEqual(["connected"]);
    conn.close();
  });

  test("S2: a cut stream reconnects with backoff 1, 2, 4, 8, then 10 s", () => {
    const { conn, statuses } = setup();
    latest().message({ phase: "lobby" });
    const waits = [];
    for (let i = 0; i < 6; i += 1) {
      const before = FakeEventSource.instances.length;
      latest().fail();
      let waited = 0;
      while (FakeEventSource.instances.length === before) {
        vi.advanceTimersByTime(100);
        waited += 100;
      }
      waits.push(waited);
    }
    expect(waits).toEqual([1000, 2000, 4000, 8000, 10000, 10000]);
    expect(statuses).toContain("reconnecting");
    conn.close();
  });

  test("S2: the reconnected stream lands on the current state and resets the backoff", () => {
    const { conn, states, statuses } = setup();
    latest().message({ phase: "lobby" });
    latest().fail();
    vi.advanceTimersByTime(1000);
    latest().message({ phase: "answering" });
    expect(states.at(-1).state.phase).toBe("answering");
    expect(statuses.at(-1)).toBe("connected");
    const before = FakeEventSource.instances.length;
    latest().fail();
    vi.advanceTimersByTime(1000);
    expect(FakeEventSource.instances.length).toBe(before + 1);
    conn.close();
  });

  test("S3: after 30 s without a connection the status is lost; Retry reconnects at once", () => {
    const { conn, statuses } = setup();
    latest().message({ phase: "lobby" });
    latest().fail();
    // Every attempt fails straight away.
    for (let elapsed = 0; elapsed < 32000; elapsed += 500) {
      vi.advanceTimersByTime(500);
      if (!latest().closed && latest().readyState === 0) latest().fail();
    }
    expect(conn.status).toBe("lost");
    const before = FakeEventSource.instances.length;
    conn.retry();
    expect(FakeEventSource.instances.length).toBe(before + 1);
    expect(conn.status).toBe("reconnecting");
    latest().message({ phase: "lobby" });
    expect(statuses.at(-1)).toBe("connected");
    conn.close();
  });

  test("the watchdog reopens a stream that goes silent for more than 25 s", () => {
    const { conn } = setup();
    const first = latest();
    first.message({ phase: "lobby" });
    vi.advanceTimersByTime(24000);
    expect(first.closed).toBe(false);
    vi.advanceTimersByTime(6000);
    expect(first.closed).toBe(true);
    expect(conn.status).toBe("reconnecting");
    vi.advanceTimersByTime(1000);
    expect(latest()).not.toBe(first);
    conn.close();
  });

  test("heartbeats keep the stream alive", () => {
    const { conn } = setup();
    const first = latest();
    first.message({ phase: "lobby" });
    for (let i = 0; i < 6; i += 1) {
      vi.advanceTimersByTime(10000);
      first.heartbeat();
    }
    expect(first.closed).toBe(false);
    expect(FakeEventSource.instances.length).toBe(1);
    conn.close();
  });

  test("returning to the foreground reopens a stale stream immediately", () => {
    const { conn, doc } = setup();
    const first = latest();
    first.message({ phase: "lobby" });
    vi.advanceTimersByTime(5000);
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(FakeEventSource.instances.length).toBe(1);
    vi.advanceTimersByTime(10000);
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(first.closed).toBe(true);
    expect(FakeEventSource.instances.length).toBe(2);
    conn.close();
  });

  test("a new address reopens the stream; the old stream's messages are ignored", () => {
    const { conn, states } = setup("/events");
    const first = latest();
    first.message({ phase: "lobby" });
    conn.setUrl("/events?token=xyz");
    expect(latest().url).toBe("/events?token=xyz");
    first.message({ phase: "stale" });
    expect(states.map((s) => s.state.phase)).toEqual(["lobby"]);
    conn.close();
  });
});
