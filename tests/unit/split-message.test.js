import { describe, expect, test } from "vitest";
import { splitMessage } from "../../client/src/shared/format.js";

describe("splitMessage", () => {
  test("the first sentence is the title, the rest the subtitle", () => {
    expect(splitMessage("The quiz has started. Playing already? Enter the same name to rejoin.")).toEqual({
      title: "The quiz has started.",
      subtitle: "Playing already? Enter the same name to rejoin."
    });
    expect(splitMessage("Couldn't send your answer. Tap again.")).toEqual({
      title: "Couldn't send your answer.",
      subtitle: "Tap again."
    });
    expect(splitMessage("Time's up! Wait for the reveal.")).toEqual({ title: "Time's up!", subtitle: "Wait for the reveal." });
    expect(splitMessage("Ready? Go.")).toEqual({ title: "Ready?", subtitle: "Go." });
  });

  test("one sentence has no subtitle", () => {
    expect(splitMessage("The answer window is closed.")).toEqual({ title: "The answer window is closed.", subtitle: "" });
    expect(splitMessage("Connection lost")).toEqual({ title: "Connection lost", subtitle: "" });
  });

  test("a full stop without a following space doesn't split", () => {
    expect(splitMessage("Open quiz.example.com now")).toEqual({ title: "Open quiz.example.com now", subtitle: "" });
  });

  test("empty or missing input", () => {
    expect(splitMessage("")).toEqual({ title: "", subtitle: "" });
    expect(splitMessage(undefined)).toEqual({ title: "", subtitle: "" });
  });
});
