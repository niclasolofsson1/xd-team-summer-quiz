import { describe, expect, test, vi } from "vitest";
import { postWithRetry } from "../../client/src/shared/api.js";
import { submitAnswer } from "../../client/src/shared/answer.js";

function reply(status, data) {
  return Promise.resolve({ status, json: () => Promise.resolve(data) });
}

const noSleep = vi.fn(() => Promise.resolve());

describe("postWithRetry", () => {
  test("S4: a dropped request is retried", async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockImplementationOnce(() => reply(200, { ok: true, optionIndex: 2 }));
    const sleep = vi.fn(() => Promise.resolve());
    const result = await postWithRetry("answer", { optionIndex: 2 }, { fetchImpl, sleep });
    expect(result).toEqual({ ok: true, status: 200, data: { ok: true, optionIndex: 2 } });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(500);
  });

  test("server errors are retried, up to 3 times", async () => {
    const fetchImpl = vi.fn(() => reply(502, {}));
    const result = await postWithRetry("answer", {}, { fetchImpl, sleep: noSleep });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(result).toEqual({ ok: false, status: 0, data: {} });
  });

  test("a 4xx is the server's answer and isn't retried", async () => {
    const fetchImpl = vi.fn(() => reply(409, { ok: false, message: "The answer window is closed." }));
    const result = await postWithRetry("answer", {}, { fetchImpl, sleep: noSleep });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(409);
  });

  test("ok: false in a 200 reply (join errors) is not a success", async () => {
    const fetchImpl = vi.fn(() => reply(200, { ok: false, message: "That name is already taken." }));
    const result = await postWithRetry("join", {}, { fetchImpl, sleep: noSleep });
    expect(result.ok).toBe(false);
    expect(result.data.message).toBe("That name is already taken.");
  });
});

describe("submitAnswer", () => {
  test("S5: the locked option is the one the server recorded", async () => {
    // The player tapped C (2), but an earlier, lost request for A (0) reached the server first.
    const post = vi.fn(() => Promise.resolve({ ok: true, status: 200, data: { ok: true, optionIndex: 0 } }));
    expect(await submitAnswer("token", 2, post)).toEqual({ status: "locked", optionIndex: 0 });
    expect(post).toHaveBeenCalledWith("answer", { token: "token", optionIndex: 2 });
  });

  test("every attempt failing asks the player to tap again", async () => {
    const post = () => Promise.resolve({ ok: false, status: 0, data: {} });
    expect(await submitAnswer("token", 1, post)).toEqual({ status: "failed" });
  });

  test("a closed window and an unknown player are reported", async () => {
    const closed = () => Promise.resolve({ ok: false, status: 409, data: { message: "The answer window is closed." } });
    expect(await submitAnswer("t", 1, closed)).toEqual({ status: "closed", message: "The answer window is closed." });
    const gone = () => Promise.resolve({ ok: false, status: 403, data: { message: "Player not found. Join again." } });
    expect(await submitAnswer("t", 1, gone)).toEqual({ status: "lost", message: "Player not found. Join again." });
  });
});
