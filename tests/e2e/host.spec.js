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
  await expect(page.locator(".stage-panel")).toBeVisible();
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

const primary = (page) => page.locator(".stage-panel__primary");

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
  await expect(page.getByRole("heading", { name: "Waiting for players" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Waiting for players" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Host access" })).toHaveCount(0);
});

test("lobby: question set, answer time, test-set warning and join link", async ({ page, request }) => {
  await unlock(page);
  await expect(primary(page)).toBeDisabled();
  await expect(page.getByText("You're about to run the test questions.")).toBeVisible();
  await expect(page.locator(".join-panel__url")).toHaveText(/^https?:\/\/\S+$/);
  await expect(page.getByRole("link", { name: "Open display screen" })).toHaveAttribute("href", "/display.html");

  await page.getByRole("tab", { name: /Real questions/ }).click();
  await expect.poll(async () => (await state(request)).questionSetId).toBe("real");
  await expect(page.getByText("You're about to run the test questions.")).toHaveCount(0);
  await expect(page.locator(".host-header")).toContainText("Real questions");

  await page.getByRole("tab", { name: "10 s", exact: true }).click();
  await expect.poll(async () => (await state(request)).answerMs).toBe(10000);

  await page.getByRole("tab", { name: /Test questions/ }).click();
  await expect(page.getByText("You're about to run the test questions.")).toBeVisible();

  await api(request, "join", { name: "Bea", avatarId: "fox" });
  await expect(page.getByRole("heading", { name: "1 player joined" })).toBeVisible();
  await expect(page.locator(".players-panel")).toContainText("Bea");
  await expect(primary(page)).toBeEnabled();
});

test("a full quiz run with a player, through the final reveal with the private preview", async ({ page, browser, request }) => {
  await unlock(page);
  await page.getByRole("tab", { name: "5 s", exact: true }).click();
  await expect.poll(async () => (await state(request)).answerMs).toBe(5000);
  const ada = await phonePlayer(browser, "Ada");
  const bot = await api(request, "join", { name: "Bob", avatarId: "owl" });
  const cy = await api(request, "join", { name: "Cy", avatarId: "cat" });
  await expect(page.locator(".players-panel__summary")).toContainText("3 players");

  await primary(page).click();
  const { totalQuestions } = await state(request);
  for (let q = 0; q < totalQuestions; q += 1) {
    await expect(page.locator(".stage-panel__eyebrow")).toHaveText(`Question ${q + 1} of ${totalQuestions}`);
    await expect(page.locator(".stage-question__text")).toBeVisible();
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
      await expect(page.locator(".stage-panel .leaderboard")).toBeVisible();
      await expect(primary(page)).toHaveText("Next question");
      await primary(page).click();
    }
  }

  // Final reveal: stage 0 → 1 → 2 → 3, with the private preview at stages 1 and 2.
  await expect(page.locator(".stage-panel__eyebrow")).toHaveText("Stage 0 of 3");
  await expect(primary(page)).toHaveText("Start final reveal");
  await primary(page).click();
  await expect(page.locator(".stage-panel__eyebrow")).toHaveText("Stage 1 of 3");
  await expect(page.getByText("Preview of the next step · only on your screen")).toBeVisible();
  await expect(page.locator(".final-panel__preview .podium__place--revealed")).toHaveCount(1);
  await expect(primary(page)).toHaveText("Reveal 3rd place");
  await primary(page).click();
  await expect(page.locator(".stage-panel__eyebrow")).toHaveText("Stage 2 of 3");
  await expect(page.locator(".final-panel__preview .podium__place--revealed")).toHaveCount(3);
  // The champion is still hidden from everyone else.
  expect((await state(request)).participants.some((p) => p.name === "Locked player")).toBe(true);
  await expect(primary(page)).toHaveText("Reveal champion");
  await primary(page).click();
  await expect(page.locator(".stage-panel__eyebrow")).toHaveText("Stage 3 of 3");
  await expect(primary(page)).toBeDisabled();
  await expect(page.locator(".stage-panel .podium__place--revealed")).toHaveCount(3);
  await expect(ada.page.getByText("Champion").first()).toBeVisible();
  await ada.context.close();
});

test("clicker: → / PageDown / Space step the quiz, debounced, never inside the reset dialog", async ({ page, request }) => {
  await unlock(page);
  await api(request, "join", { name: "Bea", avatarId: "fox" });
  await expect(primary(page)).toBeEnabled();

  // Space on the Copy button copies; it doesn't start the quiz.
  await page.locator(".join-panel .cds--copy-btn").focus();
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
  await page.getByRole("tab", { name: /Real questions/ }).click();
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
  await expect(page.getByRole("heading", { name: "Waiting for players" })).toBeVisible();
  await expect(ada.page.getByText("The quiz was reset. Join again to play.")).toBeVisible();
  await ada.context.close();
});

test("layout: panels side by side from 1024 px, stacked below, never scrolling sideways", async ({ page }) => {
  await unlock(page);
  const boxes = async () => ({
    stage: await page.locator(".stage-panel").boundingBox(),
    players: await page.locator(".players-panel").boundingBox()
  });
  for (const width of [1280, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    const { stage, players } = await boxes();
    expect(players.x).toBeGreaterThan(stage.x + stage.width - 1);
  }
  await page.setViewportSize({ width: 900, height: 800 });
  const { stage, players } = await boxes();
  expect(players.y).toBeGreaterThan(stage.y + stage.height - 1);
  for (const width of [1440, 1024, 900]) {
    await page.setViewportSize({ width, height: 800 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  }
  expect((await primary(page).boundingBox()).height).toBeGreaterThanOrEqual(48);
});
