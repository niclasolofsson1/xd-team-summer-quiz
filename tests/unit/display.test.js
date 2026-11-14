import { describe, expect, test } from "vitest";
import {
  answeredLabel,
  displayUrl,
  finalStageText,
  isLocalNetworkUrl,
  joinHint,
  morePlayersLabel,
  playersLabel,
  revealSummary,
  standingsThatFit,
  topBarMeta,
  wallEntries
} from "../../client/src/display/displayView.js";

const players = (n, answered = 0) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, answered: i < answered }));

describe("big screen view logic", () => {
  test("top bar: player count in the lobby, question number and answered count during a question", () => {
    expect(topBarMeta(null)).toEqual({ question: null, count: "" });
    expect(topBarMeta({ phase: "lobby", participants: players(1) })).toEqual({ question: null, count: "1 player" });
    const q = { currentQuestionIndex: 2, totalQuestions: 25, participants: players(22, 14) };
    expect(topBarMeta({ ...q, phase: "countdown" })).toEqual({ question: "Question 3 of 25", count: "22 players" });
    expect(topBarMeta({ ...q, phase: "answering" })).toEqual({ question: "Question 3 of 25", count: "14 of 22 answered" });
    expect(topBarMeta({ ...q, phase: "reveal" }).count).toBe("14 of 22 answered");
    expect(topBarMeta({ ...q, phase: "leaderboard" }).count).toBe("22 players");
    expect(topBarMeta({ ...q, phase: "finished" })).toEqual({ question: null, count: "22 players" });
    expect(playersLabel(0)).toBe("0 players");
    expect(answeredLabel([])).toBe("0 of 0 answered");
  });

  test("reveal summary", () => {
    expect(revealSummary(null)).toEqual({ title: "", text: "" });
    expect(revealSummary({ correct: 12, missed: 2, total: 22 })).toEqual({ title: "12 of 20 got it right", text: "2 players didn't answer." });
    expect(revealSummary({ correct: 0, missed: 1, total: 3 })).toEqual({ title: "0 of 2 got it right", text: "1 player didn't answer." });
    expect(revealSummary({ correct: 5, missed: 0, total: 5 })).toEqual({ title: "5 of 5 got it right", text: "" });
    expect(revealSummary({ correct: 0, missed: 4, total: 4 })).toEqual({ title: "No one answered", text: "" });
  });

  test("lobby wall: everyone up to 28, then 27 chips and +N more", () => {
    expect(wallEntries(players(28)).more).toBe(0);
    expect(wallEntries(players(28)).shown).toHaveLength(28);
    const many = wallEntries(players(31));
    expect(many.shown).toHaveLength(27);
    expect(many.more).toBe(4);
  });

  test("final standings that fit, and the rest as a count", () => {
    expect(standingsThatFit(players(9)).more).toBe(0);
    const s = standingsThatFit(players(19));
    expect(s.shown).toHaveLength(9);
    expect(s.more).toBe(10);
    expect(morePlayersLabel(1)).toBe("and 1 more player");
    expect(morePlayersLabel(10)).toBe("and 10 more players");
  });

  test("Wi-Fi hint only for a local network join address (v1.4.1)", () => {
    expect(joinHint("https://xd-team-summer-quiz.onrender.com/")).toBe("Scan the code or type the address.");
    expect(joinHint("http://192.168.40.120:4173/")).toBe("Scan the code or type the address. Same Wi-Fi as the host.");
    expect(isLocalNetworkUrl("http://10.0.0.7:4173/")).toBe(true);
    expect(isLocalNetworkUrl("http://172.20.1.5:4173/")).toBe(true);
    expect(isLocalNetworkUrl("http://172.32.1.5:4173/")).toBe(false);
    expect(isLocalNetworkUrl("http://100.78.69.230:4173/")).toBe(false);
    expect(isLocalNetworkUrl("http://localhost:4173/")).toBe(true);
    expect(isLocalNetworkUrl("https://quiz.example.com/")).toBe(false);
    expect(isLocalNetworkUrl("")).toBe(false);
  });

  test("final stage text and join address", () => {
    expect(finalStageText(0)).toBe("The host will reveal the final results.");
    expect(finalStageText(3)).toBe("Champion and runner-up.");
    expect(finalStageText(7)).toBe("Champion and runner-up.");
    expect(displayUrl("http://192.168.40.120:4173/")).toBe("192.168.40.120:4173");
    expect(displayUrl("https://xd-team-summer-quiz.onrender.com/")).toBe("xd-team-summer-quiz.onrender.com");
    expect(displayUrl("")).toBe("");
  });
});
