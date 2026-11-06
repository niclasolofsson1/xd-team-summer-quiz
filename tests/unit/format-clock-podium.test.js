import { describe, expect, test } from "vitest";
import { ordinal, playersJoined, rankLabel, pointsLabel } from "../../client/src/shared/format.js";
import { clockOffset, msLeft, percentLeft, secondsLeft } from "../../client/src/shared/clock.js";
import { finalLayout } from "../../client/src/shared/podium.js";

describe("format", () => {
  test("ordinals and shared ranks", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map(ordinal)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st"
    ]);
    expect(rankLabel(5, true)).toBe("=5th");
    expect(rankLabel(3)).toBe("3rd");
  });

  test("counts", () => {
    expect(playersJoined(1)).toBe("1 player joined");
    expect(playersJoined(20)).toBe("20 players joined");
    expect(pointsLabel(850)).toBe("850 points");
  });
});

describe("clock", () => {
  test("timers follow the server's clock, not the phone's", () => {
    // The phone's clock is 5 s behind the server.
    const offset = clockOffset(105000, 100000);
    expect(offset).toBe(5000);
    expect(msLeft(115000, offset, 100000)).toBe(10000);
    expect(secondsLeft(115000, offset, 100500)).toBe(10);
    expect(secondsLeft(115000, offset, 112000)).toBe(0);
    expect(percentLeft(105000, 115000, offset, 102500)).toBe(75);
    expect(clockOffset(undefined, 1)).toBe(0);
  });
});

const entry = (id, rank, extra = {}) => ({ id, name: id, avatarId: "fox", score: 100 - rank, rank, tied: false, ...extra });

describe("final layout", () => {
  const full = [entry("a", 1), entry("b", 2), entry("c", 3), entry("d", 4), entry("e", 5)];

  test("stage 0: everything locked, no standings", () => {
    const { places, standings } = finalLayout([], 5, 0);
    expect(places.map((p) => p.state)).toEqual(["locked", "locked", "locked"]);
    expect(standings).toEqual([]);
  });

  test("stage 1: 4th and down; stage 2: adds 3rd; stage 3: champion and runner-up", () => {
    const one = finalLayout(full.slice(3), 5, 1);
    expect(one.standings.map((e) => e.id)).toEqual(["d", "e"]);
    expect(one.places.map((p) => p.state)).toEqual(["locked", "locked", "locked"]);

    const two = finalLayout(full.slice(2), 5, 2);
    expect(two.places[2].entry.id).toBe("c");
    expect(two.places.map((p) => p.state)).toEqual(["locked", "locked", "revealed"]);

    const three = finalLayout(full, 5, 3);
    expect(three.places.map((p) => p.entry.id)).toEqual(["a", "b", "c"]);
    expect(three.places.map((p) => p.label)).toEqual(["Champion", "Runner-up", "3rd place"]);
  });

  test("fewer than three players leaves empty places", () => {
    const { places } = finalLayout([entry("a", 1), entry("b", 2)], 2, 3);
    expect(places.map((p) => p.state)).toEqual(["revealed", "revealed", "empty"]);
  });

  test("players sharing 3rd beyond the podium are listed first in the standings", () => {
    const tied = [entry("a", 1), entry("b", 2), entry("c", 3, { tied: true }), entry("d", 3, { tied: true }), entry("e", 5)];
    const { places, standings } = finalLayout(tied, 5, 3);
    expect(places.map((p) => p.entry.id)).toEqual(["a", "b", "c"]);
    expect(standings.map((e) => e.id)).toEqual(["d", "e"]);
  });
});
