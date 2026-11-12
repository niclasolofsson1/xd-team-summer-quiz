import { expect, test } from "@playwright/test";

// The Carbon host app on a laptop-sized screen, against the real server (HOST_PIN e2e-pin).
// Players are phone-sized browser contexts or API joins.
const HOST_PIN = "e2e-pin";

test.use({ viewport: { width: 1280, height: 800 }, hasTouch: false });

async function api(request, action, body = {}) {
  const res = await request.post(`/api/${action}`, { data: { hostPin: HOST_PIN, ...body } });
  return res.json();
}

async function state(request) {
  return (await request.get("/api/state")).json();
}

async function unlock(page) {
  await page.goto("/host.html");
  await page.getByLabel("Host PIN").fill(HOST_PIN);
  await page.getByRole("button", { name: "Open dashboard" }).click();
  await expect(page.locator(".control-panel")).toBeVisible();
}

async function phonePlayer(browser, name) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/participant.html");
  await page.getByLabel("Your name").fill(name);
  await page.locator("label.cds--tile--selectable", { hasText: "Panda" }).click();
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByRole("heading", { name: `You're in, ${name}!` })).toBeVisible();
  return { page, context };
}

const primary = (page) => page.locator(".control-panel__primary");

test.beforeEach(async ({ request }) => {
  await api(request, "reset");
});

test("PIN gate: a wrong PIN is refused, the right one opens the dashboard and survives a refresh", async ({ page }) => {
  await page.goto("/host.html");
  await expect(page.getByRole("heading", { name: "Host access" })).toBeVisible();
  await page.getByLabel("Host PIN").fill("wrong");
  await page.getByRole("button", { name: "Open dashboard" }).click();
  await expect(page.getByText("Host PIN is incorrect.")).toBeVisible();
  await page.getByLabel("Host PIN").fill(HOST_PIN);
  await page.getByRole("button", { name: "Open dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Set up the quiz" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Set up the quiz" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Host access" })).toHaveCount(0);
});

test("lobby: question set, answer time, test-set warning and join link", async ({ page, request }) => {
  await unlock(page);
  await expect(primary(page)).toBeDisabled();
  await expect(page.getByText("You're about to run the test questions.")).toBeVisible();
  await expect(page.locator(".join-panel__url")).toHaveAttribute("data-url", /^https?:\/\/\S+$/);
  await expect(page.getByText("Waiting for the first player")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open display screen" })).toHaveAttribute("href", "/display.html");

  await page.getByLabel("Question set").selectOption("real");
  await expect.poll(async () => (await state(request)).questionSetId).toBe("real");
  await expect(page.getByText("You're about to run the test questions.")).toHaveCount(0);
  await expect(page.getByLabel("Question set")).toHaveValue("real");

  await page.getByLabel("Answer time").selectOption("10");
  await expect.poll(async () => (await state(request)).answerMs).toBe(10000);

  await page.getByLabel("Question set").selectOption("test");
  await expect(page.getByText("You're about to run the test questions.")).toBeVisible();

  await api(request, "join", { name: "Bea", avatarId: "fox" });
  await expect(page.getByRole("heading", { name: "1 player joined" })).toBeVisible();
  await expect(page.locator(".player-wall")).toContainText("Bea");
  await expect(page.locator(".control-panel__hint")).toHaveText("Test questions · 3 questions · 10 s each");
  await expect(primary(page)).toBeEnabled();
});

test("a full quiz run with a player, through the final reveal with the private preview", async ({ page, browser, request }) => {
  await unlock(page);
  await page.getByLabel("Answer time").selectOption("5");
  await expect.poll(async () => (await state(request)).answerMs).toBe(5000);
  const ada = await phonePlayer(browser, "Ada");
  const bot = await api(request, "join", { name: "Bob", avatarId: "owl" });
  const cy = await api(request, "join", { name: "Cy", avatarId: "cat" });
  await expect(page.locator(".player-wall__count")).toHaveText("3 joined");

  await primary(page).click();
  const { totalQuestions } = await state(request);
  for (let q = 0; q < totalQuestions; q += 1) {
    await expect(page.locator(".control-panel__eyebrow")).toHaveText(`Question ${q + 1} of ${totalQuestions}`);
    await expect(page.locator(".stage-view__question")).toBeVisible();
    await expect(primary(page)).toBeDisabled();
    await ada.page.locator("button.answer-tile--a").click();
    await expect(ada.page.getByText("Answer locked")).toBeVisible();
    await api(request, "answer", { token: bot.token, optionIndex: 1 });
    await api(request, "answer", { token: cy.token, optionIndex: 2 });

    // Everyone answered: the window closes early and Reveal answer is ready.
    await expect(primary(page)).toHaveText("Reveal answer");
    await expect(primary(page)).toBeEnabled();
    await expect(page.locator(".players-panel__summary")).toContainText("3 of 3 answered");
    await expect(page.locator(".player-row__answered svg")).toHaveCount(3);
    await primary(page).click();

    await expect(page.locator(".reveal-stats")).toContainText("Players");
    await expect(page.locator(".answer-tile--correct")).toHaveCount(1);
    const last = q === totalQuestions - 1;
    await expect(primary(page)).toHaveText(last ? "Reveal final results" : "Show leaderboard");
    await primary(page).click();
    if (!last) {
      await expect(page.locator(".stage-view .leaderboard")).toBeVisible();
      await expect(primary(page)).toHaveText("Next question");
      await primary(page).click();
    }
  }

  // Final reveal: stage 0 → 1 → 2 → 3, with the private preview at stages 1 and 2.
  await expect(page.locator(".control-panel__eyebrow")).toHaveText("Stage 0 of 3");
  await expect(primary(page)).toHaveText("Start final reveal");
  await primary(page).click();
  await expect(page.locator(".control-panel__eyebrow")).toHaveText("Stage 1 of 3");
  await expect(page.getByText("Preview of the next step · only on your screen")).toBeVisible();
  await expect(page.locator(".final-panel__preview .podium__place--revealed")).toHaveCount(1);
  await expect(primary(page)).toHaveText("Reveal 3rd place");
  await primary(page).click();
  await expect(page.locator(".control-panel__eyebrow")).toHaveText("Stage 2 of 3");
  await expect(page.locator(".final-panel__preview .podium__place--revealed")).toHaveCount(3);
  // The champion is still hidden from everyone else.
  expect((await state(request)).participants.some((p) => p.name === "Locked player")).toBe(true);
  await expect(primary(page)).toHaveText("Reveal champion");
  await primary(page).click();
  await expect(page.locator(".control-panel__eyebrow")).toHaveText("Stage 3 of 3");
  await expect(primary(page)).toBeDisabled();
  await expect(page.locator(".stage-view .podium__place--revealed")).toHaveCount(3);
  await expect(ada.page.getByText("Champion").first()).toBeVisible();
  await ada.context.close();
});

test("clicker: → / PageDown / Space step the quiz, debounced, never inside the reset dialog", async ({ page, request }) => {
  await unlock(page);
  await api(request, "join", { name: "Bea", avatarId: "fox" });
  await expect(primary(page)).toBeEnabled();

  // Space on the Copy button copies; it doesn't start the quiz.
  await page.locator(".join-panel__copy").focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
  expect((await state(request)).phase).toBe("lobby");

  // Inside the reset dialog the clicker does nothing.
  await page.getByRole("button", { name: "Quiz menu" }).click();
  await page.getByRole("menuitem", { name: "Reset quiz…" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  expect((await state(request)).phase).toBe("lobby");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  // → starts the quiz; a second press straight away is swallowed by the debounce.
  await page.locator("body").click({ position: { x: 5, y: 300 } });
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => (await state(request)).phase).not.toBe("lobby");
  await page.keyboard.press("PageDown");
  await page.waitForTimeout(200);
  expect(["countdown", "answering"]).toContain((await state(request)).phase);

  // Out of phase (answer window still open): the key does nothing.
  await expect.poll(async () => (await state(request)).phase, { timeout: 5000 }).toBe("answering");
  await page.waitForTimeout(1100);
  await page.keyboard.press("PageDown");
  await page.waitForTimeout(300);
  expect((await state(request)).phase).toBe("answering");
});

test("reset from the menu, through the danger modal, clears the quiz for everyone", async ({ page, browser, request }) => {
  await unlock(page);
  const ada = await phonePlayer(browser, "Ada");
  await page.getByLabel("Question set").selectOption("real");
  await expect.poll(async () => (await state(request)).questionSetId).toBe("real");

  await page.getByRole("button", { name: "Quiz menu" }).click();
  await page.getByRole("menuitem", { name: "Reset quiz…" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Reset the quiz?");
  await dialog.getByRole("button", { name: "Reset quiz" }).click();
  await expect(dialog).toBeHidden();

  const after = await state(request);
  expect(after.participants).toHaveLength(0);
  expect(after.questionSetId).toBe("test");
  await expect(page.getByRole("heading", { name: "Set up the quiz" })).toBeVisible();
  await expect(ada.page.getByText("The quiz was reset.", { exact: true })).toBeVisible();
  await expect(ada.page.getByText("Join again to play.", { exact: true })).toBeVisible();
  await ada.context.close();
});

test("layout: control column beside the main area from 1024 px, stacked below, never scrolling sideways", async ({ page, request }) => {
  await unlock(page);
  const box = (selector) => page.locator(selector).boundingBox();
  for (const width of [1440, 1280, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    const wall = await box(".player-wall");
    const control = await box(".control-panel");
    expect(control.x).toBeGreaterThan(wall.x + wall.width - 1);
    // Panels fill the screen height: the control column reaches the bottom padding.
    expect(control.y + control.height).toBeGreaterThan(800 - 32 - 2);
  }
  await page.setViewportSize({ width: 900, height: 800 });
  const join = await box(".join-panel");
  const control = await box(".control-panel");
  expect(control.y).toBeGreaterThan(join.y + join.height - 1);
  for (const width of [1440, 1024, 900, 600, 360]) {
    await page.setViewportSize({ width, height: 800 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }

  // The primary step: full panel width, 64 px, label centred vertically (not in the top corner).
  await page.setViewportSize({ width: 1280, height: 800 });
  await api(request, "join", { name: "Bea", avatarId: "fox" });
  await expect(primary(page)).toBeEnabled();
  const panel = await box(".control-panel");
  const button = await primary(page).boundingBox();
  expect(button.height).toBeGreaterThanOrEqual(64);
  expect(Math.abs(button.width - panel.width)).toBeLessThanOrEqual(1);
  const label = await primary(page).evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el.firstChild);
    const r = range.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom };
  });
  const middle = (label.top + label.bottom) / 2;
  expect(Math.abs(middle - (button.y + button.height / 2))).toBeLessThanOrEqual(3);
});
