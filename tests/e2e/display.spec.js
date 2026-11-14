import { expect, test } from "@playwright/test";

// The Carbon big screen (/display.html) at projector sizes, against the real server (HOST_PIN e2e-pin).
// The host and players are driven over the API. Phases are checked at 1280×720 and 1920×1080:
// the screen never scrolls and nothing sticks out of the main area.
const HOST_PIN = "e2e-pin";
const SIZES = [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 }
];

test.use({ viewport: SIZES[0], hasTouch: false });

async function api(request, action, body = {}) {
  const res = await request.post(`/api/${action}`, { data: { hostPin: HOST_PIN, ...body } });
  return res.json();
}

async function state(request) {
  return (await request.get("/api/state")).json();
}

// The lobby wall and the final standings clip on purpose; they're checked by their own counts.
async function expectNoScroll(page, label) {
  for (const size of SIZES) {
    await page.setViewportSize(size);
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      const doc = document.documentElement;
      const main = document.querySelector(".ds-main").getBoundingClientRect();
      const outside = [...document.querySelectorAll(".ds-main *")]
        .filter((el) => !el.closest(".ds-wall__grid, .ds-stand"))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.height > 0 && (r.bottom > main.bottom + 1 || r.right > main.right + 1);
        })
        .map((el) => String(el.className));
      return {
        scrolls: doc.scrollHeight > window.innerHeight || doc.scrollWidth > window.innerWidth,
        outside,
        fontSize: getComputedStyle(doc).fontSize
      };
    });
    expect(result.scrolls, `${label} scrolls at ${size.width}×${size.height}`).toBe(false);
    expect(result.outside, `${label} overflows at ${size.width}×${size.height}`).toEqual([]);
    expect(result.fontSize).toBe(size.height === 720 ? "16px" : "24px");
  }
  await page.setViewportSize(SIZES[0]);
}

// A short leaderboard must not stretch (v1.4.2 bug): each row is one line high, with rank, avatar + name
// and points on the same line, and the list starts right under the heading.
async function expectTidyLeaderboard(page) {
  for (const size of SIZES) {
    await page.setViewportSize(size);
    const rem = size.height / 45;
    const rows = await page.evaluate(() => {
      const head = document.querySelector(".ds-lb__head").getBoundingClientRect();
      return [...document.querySelectorAll(".ds-lb .leaderboard__row")].map((row) => {
        const r = row.getBoundingClientRect();
        const mid = (sel) => {
          const b = row.querySelector(sel).getBoundingClientRect();
          return b.top + b.height / 2;
        };
        return { height: r.height, gapToHead: r.top - head.bottom, mids: [mid(".leaderboard__rank"), mid(".quiz-avatar"), mid(".leaderboard__name"), mid(".leaderboard__score")] };
      });
    });
    for (const row of rows) {
      expect(row.height, `row height at ${size.width}×${size.height}`).toBeLessThan(5 * rem);
      expect(Math.max(...row.mids) - Math.min(...row.mids), `row parts not on one line at ${size.width}×${size.height}`).toBeLessThan(0.5 * rem);
    }
    expect(rows[0].gapToHead).toBeLessThan(3 * rem);
  }
  await page.setViewportSize(SIZES[0]);
}

// Runs the whole quiz over the API up to the final phase (stage 0). `answers` per question: [token, option].
async function playThrough(request, players) {
  const { totalQuestions } = await state(request);
  for (let q = 0; q < totalQuestions; q += 1) {
    await expect.poll(async () => (await state(request)).phase, { timeout: 10000 }).toBe("answering");
    // Spread the answers so scores differ (all-wrong players would all share 1st place).
    for (const [i, p] of players.entries()) await api(request, "answer", { token: p.token, optionIndex: i % 4 });
    await expect.poll(async () => (await state(request)).phase).toBe("awaitingReveal");
    await api(request, "reveal");
    await api(request, "leaderboard");
    if (q < totalQuestions - 1) await api(request, "next");
  }
}

test.beforeEach(async ({ request }) => {
  await api(request, "reset");
});

test("lobby: QR and join address from /api/join-info, empty wall, then players appear", async ({ page, request }) => {
  await page.goto("/display.html");
  const { joinUrl } = await (await request.get("/api/join-info")).json();
  await expect(page.locator(".ds-qr__code")).toHaveAttribute("aria-label", `QR code for ${joinUrl}`);
  await expect(page.locator(".ds-join__url")).toHaveText(joinUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""));
  await expect(page.getByText("No one has joined yet.")).toBeVisible();
  await expect(page.locator(".ds-bar__meta")).toHaveText("0 players");
  await expectNoScroll(page, "empty lobby");

  await api(request, "join", { name: "Viktor Lindqvist-Andersson", avatarId: "fox" });
  await api(request, "join", { name: "Bea", avatarId: "owl" });
  await expect(page.getByRole("heading", { name: "2 players joined" })).toBeVisible();
  await expect(page.locator(".ds-chip")).toHaveCount(2);

  // A+ (v1.4.2): the longest names the phones allow (28 characters) show in full, on up to two lines,
  // and 24 players fit even when every name is long. With more, the last chip says "+N more".
  const longName = (i) => `The one and only legend no${String(i).padStart(2, "0")}`.slice(0, 28);
  for (let i = 0; i < 29; i += 1) await api(request, "join", { name: longName(i), avatarId: "panda" });
  await expect(page.getByRole("heading", { name: "31 players joined" })).toBeVisible();
  await expect(page.locator(".ds-chip--more")).toHaveText("+8 more");
  for (const size of SIZES) {
    await page.setViewportSize(size);
    const result = await page.evaluate(() => {
      const grid = document.querySelector(".ds-wall__grid").getBoundingClientRect();
      const chips = [...document.querySelectorAll(".ds-chip")];
      return {
        clipped: chips.filter((c) => c.getBoundingClientRect().bottom > grid.bottom + 1).length,
        cutNames: [...document.querySelectorAll(".ds-chip__name")]
          .filter((n) => n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1)
          .map((n) => n.textContent)
      };
    });
    expect(result.clipped, `chips cut off at ${size.width}×${size.height}`).toBe(0);
    expect(result.cutNames, `names cut at ${size.width}×${size.height}`).toEqual([]);
  }
  await expectNoScroll(page, "full lobby");
});

test("follows a whole quiz: countdown, question, time's up, reveal, leaderboard, staged final", async ({ page, request }) => {
  await api(request, "set-answer-time", { answerSeconds: 5 });
  const a = await api(request, "join", { name: "Ada", avatarId: "fox" });
  const b = await api(request, "join", { name: "Bob", avatarId: "owl" });
  const c = await api(request, "join", { name: "Cy", avatarId: "frog" });
  await page.goto("/display.html");
  await expect(page.getByRole("heading", { name: "3 players joined" })).toBeVisible();

  await api(request, "start");
  const { totalQuestions } = await state(request);
  for (let q = 0; q < totalQuestions; q += 1) {
    const first = q === 0;
    if (first) {
      await expect(page.locator(".ds-count__n")).toBeVisible();
      await expect(page.locator(".ds-count__q")).toHaveText(`Question 1 of ${totalQuestions}`);
      await expectNoScroll(page, "countdown");
    }
    await expect(page.locator(".ds-q .answer-tile")).toHaveCount(4);
    await expect(page.locator(".timer-bar")).toBeVisible();
    await expect(page.locator(".ds-bar__meta")).toContainText(`Question ${q + 1} of ${totalQuestions}`);
    await expect(page.locator(".ds-bar__meta")).toContainText("0 of 3 answered");
    if (first) await expectNoScroll(page, "question");

    await api(request, "answer", { token: a.token, optionIndex: 0 });
    await api(request, "answer", { token: b.token, optionIndex: 1 });
    await expect(page.locator(".ds-bar__meta")).toContainText("2 of 3 answered");
    // Question 1: Cy doesn't answer, so the window runs out. Later: everyone answers, it ends early.
    if (!first) await api(request, "answer", { token: c.token, optionIndex: 1 });
    await expect(page.locator(".ds-status__title")).toHaveText("Time's up!", { timeout: 10000 });
    await expect(page.locator(".timer-bar")).toHaveCount(0);
    if (first) await expectNoScroll(page, "time's up");

    await api(request, "reveal");
    await expect(page.locator(".answer-tile--correct")).toHaveCount(1);
    await expect(page.locator(".answer-tile--dim")).toHaveCount(3);
    await expect(page.locator(".ds-status__title")).toHaveText(/^\d of (2|3) got it right$/);
    if (first) {
      await expect(page.locator(".ds-status__text")).toHaveText("1 player didn't answer.");
      await expectNoScroll(page, "reveal");
    }

    await api(request, "leaderboard");
    if (q < totalQuestions - 1) {
      await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible();
      await expect(page.locator(".ds-lb .leaderboard__row")).toHaveCount(3);
      if (first) {
        await expectNoScroll(page, "leaderboard");
        await expectTidyLeaderboard(page);
      }
      await api(request, "next");
    }
  }

  // Final, stage 0: three locked places and no names.
  await expect(page.getByRole("heading", { name: "Final results" })).toBeVisible();
  await expect(page.locator(".podium__place--locked")).toHaveCount(3);
  await expect(page.locator(".ds-final")).not.toContainText("Ada");
  await expectNoScroll(page, "final stage 0");

  const texts = ["4th place and down.", "3rd place.", "Champion and runner-up."];
  for (const stage of [1, 2, 3]) {
    await api(request, "final-reveal");
    await expect(page.locator(".ds-final__sub")).toHaveText(texts[stage - 1]);
    await expect(page.locator(".podium__place--revealed")).toHaveCount(stage === 3 ? 3 : stage === 2 ? 1 : 0);
    await expectNoScroll(page, `final stage ${stage}`);
  }
  // Podium steps (v1.4.3): champion tallest, then runner-up, then 3rd, each label inside its step.
  for (const size of SIZES) {
    await page.setViewportSize(size);
    const rem = size.height / 45;
    const steps = await page.evaluate(() =>
      [1, 2, 3].map((place) => {
        const step = document.querySelector(`.podium__place--${place} .podium__step`);
        return { height: step.getBoundingClientRect().height, fits: step.scrollHeight <= step.clientHeight + 1 };
      })
    );
    [12, 8.5, 5.5].forEach((want, i) => {
      expect(Math.abs(steps[i].height / rem - want), `step ${i + 1} height at ${size.width}×${size.height}`).toBeLessThan(0.1);
    });
    expect(steps.every((s) => s.fits), `labels fit at ${size.width}×${size.height}`).toBe(true);
  }
  await page.setViewportSize(SIZES[0]);
  // Reduced motion (the test default): no confetti.
  await expect(page.locator(".ds-confetti")).toBeHidden();
});

test("final standings next to the podium fit at both sizes with many players", async ({ page, request }) => {
  await api(request, "set-answer-time", { answerSeconds: 5 });
  const players = [];
  for (let i = 0; i < 22; i += 1) players.push(await api(request, "join", { name: `Player ${i}`, avatarId: "panda" }));
  await api(request, "start");
  await playThrough(request, players);
  await api(request, "final-reveal");
  await page.goto("/display.html");
  await expect(page.locator(".ds-stand .leaderboard__row")).toHaveCount(9);
  await expect(page.locator(".ds-stand__more")).toHaveText("and 10 more players");
  for (const size of SIZES) {
    await page.setViewportSize(size);
    const clipped = await page.evaluate(() => {
      const box = document.querySelector(".ds-stand").getBoundingClientRect();
      return [...document.querySelectorAll(".ds-stand .leaderboard__row, .ds-stand__more")].filter((r) => r.getBoundingClientRect().bottom > box.bottom + 1).length;
    });
    expect(clipped, `standings cut off at ${size.width}×${size.height}`).toBe(0);
  }
  await expectNoScroll(page, "final standings, 22 players");
});

test("champion confetti keeps falling without reduced motion", async ({ browser, request }) => {
  await api(request, "set-answer-time", { answerSeconds: 5 });
  const a = await api(request, "join", { name: "Ada", avatarId: "fox" });
  await api(request, "start");
  await playThrough(request, [a]);
  for (let i = 0; i < 3; i += 1) await api(request, "final-reveal");

  const context = await browser.newContext({ viewport: SIZES[0], reducedMotion: "no-preference" });
  const page = await context.newPage();
  await page.goto("/display.html");
  await expect(page.locator(".ds-confetti")).toBeVisible();
  const iterations = await page.locator(".ds-confetti i").first().evaluate((el) => getComputedStyle(el).animationIterationCount);
  expect(iterations).toBe("infinite");
  await context.close();
});
