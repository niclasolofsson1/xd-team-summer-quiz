import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { blue60, purple60, teal60, magenta60 } from "@carbon/colors";

// WCAG contrast ratio between two hex colours.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("answer colours", () => {
  const tokens = readFileSync(new URL("../../client/src/styles/quiz-tokens.scss", import.meta.url), "utf8");

  test("A–D are Carbon Blue, Purple, Teal and Magenta 60", () => {
    expect(tokens).toMatch(/\$answer-a: colors\.\$blue-60;/);
    expect(tokens).toMatch(/\$answer-b: colors\.\$purple-60;/);
    expect(tokens).toMatch(/\$answer-c: colors\.\$teal-60;/);
    expect(tokens).toMatch(/\$answer-d: colors\.\$magenta-60;/);
  });

  test.each([["A", blue60], ["B", purple60], ["C", teal60], ["D", magenta60]])(
    "white text on %s is at least 4.5:1",
    (_, color) => {
      expect(contrast(color, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    }
  );
});
