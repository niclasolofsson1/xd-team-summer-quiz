import { describe, expect, it, vi } from "vitest";
import { hostStep, phaseLabel, playersSummary, previewStage } from "../../client/src/host/hostSteps.js";
import { createClicker, isClickerKey, shouldIgnore } from "../../client/src/host/clicker.js";
import { hostAction, OFFLINE_MESSAGE } from "../../client/src/host/hostApi.js";

const player = (id, extra = {}) => ({ id, name: id, avatarId: "fox", score: 0, answered: false, connected: true, ...extra });

function state(overrides = {}) {
  return {
    phase: "lobby",
    currentQuestionIndex: 0,
    totalQuestions: 3,
    finalRevealStage: 0,
    questionSetId: "test",
    questionSetName: "Test questions",
    answerMs: 20000,
    participants: [player("a"), player("b")],
    ...overrides
  };
}

describe("hostStep", () => {
  it("starts from the lobby once a player has joined", () => {
    expect(hostStep(state())).toMatchObject({ label: "Start quiz", action: "start", enabled: true, title: "2 players joined" });
    expect(hostStep(state()).hint).toBe("Test questions · 3 questions · 20 s each");
    const empty = hostStep(state({ participants: [] }));
    expect(empty).toMatchObject({ action: "start", enabled: false, title: "Set up the quiz" });
    expect(empty.hint).toMatch(/when the first player joins/);
  });

  it("waits during the countdown and the answer window", () => {
    for (const phase of ["countdown", "answering"]) {
      const step = hostStep(state({ phase, currentQuestionIndex: 1 }));
      expect(step).toMatchObject({ label: "Reveal answer", enabled: false, eyebrow: "Question 2 of 3" });
    }
    expect(hostStep(state({ phase: "answering" })).hint).toBe("Reveal unlocks when the time is up or everyone has answered.");
  });

  it("reveals, then shows the leaderboard, then the next question", () => {
    expect(hostStep(state({ phase: "awaitingReveal" }))).toMatchObject({ label: "Reveal answer", action: "reveal", enabled: true });
    expect(hostStep(state({ phase: "reveal" }))).toMatchObject({ label: "Show leaderboard", action: "leaderboard" });
    expect(hostStep(state({ phase: "leaderboard" }))).toMatchObject({ label: "Next question", action: "next" });
  });

  it("goes to the final results after the last question", () => {
    expect(hostStep(state({ phase: "reveal", currentQuestionIndex: 2 }))).toMatchObject({
      label: "Reveal final results",
      action: "leaderboard"
    });
  });

  it("steps through the final reveal and stops at stage 3", () => {
    const labels = [0, 1, 2].map((stage) => hostStep(state({ phase: "finished", finalRevealStage: stage })));
    expect(labels.map((step) => step.label)).toEqual(["Start final reveal", "Reveal 3rd place", "Reveal champion"]);
    expect(labels.every((step) => step.action === "final-reveal" && step.enabled)).toBe(true);
    expect(hostStep(state({ phase: "finished", finalRevealStage: 3 }))).toMatchObject({ action: null, enabled: false });
  });

  it("does nothing before the first state arrives", () => {
    expect(hostStep(null)).toMatchObject({ action: null, enabled: false });
  });

  it("names every phase", () => {
    expect(phaseLabel("awaitingReveal")).toBe("Time's up");
    expect(phaseLabel("finished")).toBe("Final reveal");
  });
});

describe("playersSummary", () => {
  it("counts answers and offline players during a question", () => {
    const s = state({
      phase: "answering",
      participants: [player("a", { answered: true }), player("b", { connected: false }), player("c", { answered: true })]
    });
    expect(playersSummary(s)).toBe("2 of 3 answered · 1 offline");
  });

  it("counts players outside a question and leaves out a zero offline count", () => {
    expect(playersSummary(state())).toBe("2 players");
    expect(playersSummary(state({ participants: [player("a")] }))).toBe("1 player");
  });

  it("doesn't count locked players in the final reveal as offline", () => {
    const locked = { id: "x", name: "Locked player", avatarId: null, score: null, answered: false, connected: false };
    expect(playersSummary(state({ phase: "finished", participants: [player("a"), locked] }))).toBe("2 players");
  });
});

describe("previewStage", () => {
  it("previews the next podium step at stages 1 and 2 only", () => {
    expect([0, 1, 2, 3].map(previewStage)).toEqual([null, 2, 3, null]);
  });
});

// A stand-in for a DOM element: closest() answers from a list of selectors it "matches".
const el = (tag, matching = []) => ({
  tagName: tag.toUpperCase(),
  isContentEditable: false,
  closest: (selector) => (matching.some((m) => selector.includes(m)) ? {} : null)
});
const key = (k, target = el("body"), extra = {}) => ({ key: k, target, preventDefault: vi.fn(), ...extra });

describe("clicker", () => {
  it("knows the clicker keys and ignores modified or other keys", () => {
    expect(["ArrowRight", "PageDown", " "].every((k) => isClickerKey({ key: k }))).toBe(true);
    expect(isClickerKey({ key: "ArrowLeft" })).toBe(false);
    expect(isClickerKey({ key: "PageUp" })).toBe(false);
    expect(isClickerKey({ key: "b" })).toBe(false);
    expect(isClickerKey({ key: "ArrowRight", ctrlKey: true })).toBe(false);
  });

  it("is ignored while typing, in a dialog or a menu", () => {
    expect(shouldIgnore(key("ArrowRight", el("input", ["input"])))).toBe(true);
    expect(shouldIgnore(key("ArrowRight", el("textarea", ["textarea"])))).toBe(true);
    expect(shouldIgnore(key("ArrowRight"), { dialogOpen: true })).toBe(true);
    expect(shouldIgnore(key("PageDown", el("button", ["role='menu'"])))).toBe(true);
    expect(shouldIgnore(key("ArrowRight", { isContentEditable: true }))).toBe(true);
  });

  it("leaves Space to a focused button, but → still works there", () => {
    const button = el("button", ["button"]);
    expect(shouldIgnore(key(" ", button))).toBe(true);
    expect(shouldIgnore(key("ArrowRight", button))).toBe(false);
    expect(shouldIgnore(key(" "))).toBe(false);
  });

  it("presses once per second at most and stops the page from scrolling", () => {
    let time = 0;
    const onTrigger = vi.fn();
    const handle = createClicker({ onTrigger, now: () => time });
    const first = key("PageDown");
    expect(handle(first)).toBe(true);
    expect(first.preventDefault).toHaveBeenCalled();
    time = 400;
    const second = key(" ");
    expect(handle(second)).toBe(false);
    expect(second.preventDefault).toHaveBeenCalled();
    time = 1000;
    expect(handle(key("ArrowRight"))).toBe(true);
    expect(onTrigger).toHaveBeenCalledTimes(2);
  });

  it("ignores held-down keys and doesn't touch ignored ones", () => {
    const onTrigger = vi.fn();
    const handle = createClicker({ onTrigger, now: () => 5000 });
    expect(handle(key("ArrowRight", el("body"), { repeat: true }))).toBe(false);
    const typing = key(" ", el("input", ["input"]));
    expect(handle(typing)).toBe(false);
    expect(typing.preventDefault).not.toHaveBeenCalled();
    expect(onTrigger).not.toHaveBeenCalled();
  });
});

describe("hostAction", () => {
  const reply = (status, data) => vi.fn(async () => ({ status, json: async () => data }));

  it("sends the PIN with every action", async () => {
    const fetchImpl = reply(200, { ok: true });
    const result = await hostAction("start", "1234", { x: 1 }, { fetchImpl });
    expect(result.ok).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/start");
    expect(JSON.parse(init.body)).toEqual({ x: 1, hostPin: "1234" });
  });

  it("returns the server's message for a wrong PIN, once, without retrying", async () => {
    const fetchImpl = reply(403, { ok: false, message: "Host PIN is incorrect." });
    const result = await hostAction("final-reveal", "nope", {}, { fetchImpl });
    expect(result).toMatchObject({ ok: false, status: 403, message: "Host PIN is incorrect." });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("treats ok:false in a 200 reply as a failure", async () => {
    const fetchImpl = reply(200, { ok: false, message: "Answer time can only be changed in the lobby." });
    const result = await hostAction("set-answer-time", "", { answerSeconds: 10 }, { fetchImpl });
    expect(result).toMatchObject({ ok: false, message: "Answer time can only be changed in the lobby." });
  });

  it("says when the server can't be reached", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const result = await hostAction("next", "", {}, { fetchImpl });
    expect(result).toMatchObject({ ok: false, status: 0, message: OFFLINE_MESSAGE });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
