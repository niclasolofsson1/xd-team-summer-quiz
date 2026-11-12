import { expect, test } from "@playwright/test";

// The host side is driven through the API; the player is a phone-sized browser.
const HOST_PIN = "e2e-pin";

async function host(request, action, body = {}) {
  const res = await request.post(`/api/${action}`, { data: { hostPin: HOST_PIN, ...body } });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

async function apiJoin(request, name, avatarId = "owl") {
  const res = await request.post("/api/join", { data: { name, avatarId } });
  return res.json();
}

async function state(request) {
  return (await request.get("/api/state")).json();
}

async function joinAs(page, name, avatarLabel = "Panda") {
  await page.goto("/participant.html");
  await page.getByLabel("Your name").fill(name);
  await page.locator("label.cds--tile--selectable", { hasText: avatarLabel }).click();
  await expect(page.getByRole("radio", { name: avatarLabel })).toBeChecked();
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByRole("heading", { name: `You're in, ${name}!` })).toBeVisible();
}

const answerButton = (page, letter) => page.locator(`button.answer-tile--${letter}`);

test.beforeEach(async ({ request }) => {
  await host(request, "reset");
});

test("S1: a half-typed name survives 20 other players joining", async ({ page, request }) => {
  await page.goto("/participant.html");
  const field = page.getByLabel("Your name");
  await field.fill("Ada Love");
  for (let i = 1; i <= 20; i += 1) await apiJoin(request, `Player ${i}`);
  await expect.poll(async () => (await state(request)).participants.length).toBe(20);
  await expect(field).toHaveValue("Ada Love");
  await field.press("End");
  await field.pressSequentially("lace");
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByRole("heading", { name: "You're in, Ada Lovelace!" })).toBeVisible();
  await expect(page.getByText("21 players joined")).toBeVisible();
});

// Tap targets ≥ 48 px, answer tiles ≥ 72 px (spec, Accessibility). Carbon's heights come from its
// layout tokens, so this also catches a stylesheet that leaves them out.
test("tap targets are phone-sized", async ({ page, request }) => {
  const height = async (locator) => (await locator.boundingBox()).height;
  await page.goto("/participant.html");
  expect(await height(page.getByRole("button", { name: "Join" }))).toBeGreaterThanOrEqual(48);
  expect(await height(page.getByLabel("Your name"))).toBeGreaterThanOrEqual(48);
  // iOS Safari zooms in on fields with text under 16 px.
  const fontSizes = await page.locator("input:not([type=radio]), textarea").evaluateAll((els) =>
    els.map((el) => parseFloat(getComputedStyle(el).fontSize))
  );
  expect(fontSizes.length).toBeGreaterThan(0);
  for (const size of fontSizes) expect(size).toBeGreaterThanOrEqual(16);
  expect(await height(page.locator("label.cds--tile--selectable").first())).toBeGreaterThanOrEqual(48);

  await joinAs(page, "Pia");
  await apiJoin(request, "Quinn");
  await host(request, "start");
  await expect(answerButton(page, "a")).toBeVisible();
  // The timer bar drains with one smooth animation, not stepwise updates.
  const bar = page.locator(".timer-bar .cds--progress-bar__bar");
  expect(await bar.evaluate((el) => getComputedStyle(el).animationName)).toBe("timer-drain");
  for (const letter of ["a", "b", "c", "d"]) {
    const tile = answerButton(page, letter);
    expect(await height(tile)).toBeGreaterThanOrEqual(72);
    // The answer text sits in the middle of the tile, top to bottom, level with the letter.
    const box = await tile.boundingBox();
    const text = await tile.locator(".answer-tile__text").boundingBox();
    expect(Math.abs(text.y + text.height / 2 - (box.y + box.height / 2))).toBeLessThanOrEqual(2);
  }
});

// Carbon's focus ring shows for keyboard users only: a tap leaves none, Tab shows it.
test("focus ring only for keyboard users", async ({ page }) => {
  const outline = (locator) => locator.evaluate((el) => getComputedStyle(el).outlineStyle);
  const shadow = (locator) => locator.evaluate((el) => getComputedStyle(el).boxShadow);
  await page.goto("/participant.html");
  const owl = page.locator("label.cds--tile--selectable", { hasText: "Owl" });
  await owl.click();
  await expect.poll(() => outline(owl)).toBe("none");

  await page.getByLabel("Your name").focus();
  await page.keyboard.press("Tab"); // into the avatar group, on the selected tile
  await expect(page.getByRole("radio", { name: "Owl" })).toBeFocused();
  await expect.poll(() => outline(owl)).not.toBe("none");

  // A tapped button (empty name, so it stays on Join) has no ring; reached by keyboard it has one.
  const join = page.getByRole("button", { name: "Join" });
  await join.click();
  await expect(page.getByText("Enter a name.")).toBeVisible();
  await expect.poll(() => shadow(join)).toBe("none");
  await page.getByRole("radio", { name: "Owl" }).focus();
  await page.keyboard.press("Tab");
  await expect(join).toBeFocused();
  await expect.poll(() => shadow(join)).not.toBe("none");
});

test("join errors: empty name and a name that's taken", async ({ page, request }) => {
  // Bo is connected (an open stream with Bo's token), so the name counts as taken.
  const boJoin = await apiJoin(request, "Bo");
  const bo = await page.context().newPage();
  await bo.goto(`/events?token=${boJoin.token}`, { waitUntil: "commit" });
  await expect.poll(async () => (await state(request)).participants[0].connected).toBe(true);

  await page.goto("/participant.html");
  await page.getByLabel("Your name").fill("");
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByText("Enter a name.")).toBeVisible();
  await page.getByLabel("Your name").fill("bo");
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByText("That name is already taken.")).toBeVisible();
  await expect(page.getByLabel("Your name")).toHaveValue("bo");
  await bo.close();
});

test("the full quiz on a phone: answer, reveal, leaderboard and final podium", async ({ page, request }) => {
  await joinAs(page, "Cleo");
  await host(request, "start");
  for (let q = 1; q <= 3; q += 1) {
    await expect(page.getByText(`Question ${q} of 3`)).toBeVisible();
    // Question in Carbon heading-04 (v1.3.3); the test questions are short, so no step-down.
    expect(await page.locator(".question__text").evaluate((el) => getComputedStyle(el).fontSize)).toBe("28px");
    await expect(answerButton(page, "b")).toBeEnabled();
    await answerButton(page, "b").click();
    // Cleo is the only player, so the answer window closes as soon as she has answered.
    await expect(page.getByRole("heading", { name: "Time's up!" })).toBeVisible();
    await expect(page.locator(".answer-tile--mine")).toHaveClass(/answer-tile--b/);
    await host(request, "reveal");
    await expect(page.locator(".result-banner")).toHaveText(/Correct! \+\d+|Not this time/);
    // Reveal (v1.3.3): one row per tile, Carbon tags under the answer, picks in their own column.
    // Your pick keeps the blue stroke as one line (no white gap) plus a "You" tag; only the correct
    // answer keeps its full colour, with a "Correct" tag.
    const mine = page.locator(".answer-tile--mine");
    await expect(mine).toHaveClass(/answer-tile--b/);
    await expect(mine.locator(".answer-tile__tags")).toContainText("You");
    expect(await mine.evaluate((el) => getComputedStyle(el).outlineOffset)).toBe("0px");
    const youTag = mine.locator(".cds--tag--outline");
    expect(await youTag.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(255, 255, 255)");
    expect(await youTag.evaluate((el) => getComputedStyle(el).boxShadow)).toBe("none");
    await expect(page.locator(".answer-tile:not(.answer-tile--dim)")).toHaveCount(1);
    await expect(page.locator(".answer-tile--correct .cds--tag--green")).toHaveText("Correct");
    await expect(page.locator(".answer-tile__picks")).toHaveCount(4);
    await expect(page.locator(".answer-tile__picks-label").first()).toHaveText(/^picks?$/);
    if (q < 3) {
      await host(request, "leaderboard");
      await expect(page.getByText("Your score")).toBeVisible();
      await expect(page.locator(".leaderboard__row--me")).toContainText("Cleo");
      if (q === 1) {
        // Column names for screen readers only (v1.3.2): present as column headers, not visible on screen.
        const board = page.getByRole("table", { name: "Leaderboard" });
        await expect(board.getByRole("columnheader")).toHaveText(["Rank", "Player", "Score"]);
        const head = await page.locator(".leaderboard .cds--structured-list-thead").boundingBox();
        expect(head.width).toBeLessThanOrEqual(1);
        expect(head.height).toBeLessThanOrEqual(1);
      }
      await host(request, "next");
    }
  }
  await host(request, "leaderboard");
  await expect(page.getByText("Waiting for the host to start the final results.")).toBeVisible();
  await host(request, "final-reveal");
  await host(request, "final-reveal");
  await host(request, "final-reveal");
  await expect(page.locator(".podium__place--1")).toContainText("Cleo");
  await expect(page.locator(".podium__place--1")).toContainText("Champion");
  await expect(page.locator(".podium__place--1 .podium__medal")).toHaveText("🥇");
  await expect(page.locator(".podium__place--1 .podium__you")).toHaveText("You");
  expect(await page.locator(".podium__place--1 .podium__who").evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("none");
  await expect(page.locator(".confetti")).toHaveCount(0);
  await expect(page.getByText(/You finished 1st/)).toBeVisible();
  await expect(page.locator(".podium__place--2")).toContainText("No player");
});

test("S4/S5: a lost answer reply is retried and the recorded option is the one shown", async ({ page, request }) => {
  await joinAs(page, "Dana");
  await apiJoin(request, "Eli"); // a second player keeps the answer window open
  let first = true;
  await page.route("**/api/answer", async (route) => {
    if (first) {
      first = false;
      await route.fetch(); // reaches the server, but the reply never gets back to the phone
      await route.abort("connectionreset");
      return;
    }
    await route.continue();
  });
  await host(request, "start");
  await expect(answerButton(page, "c")).toBeEnabled();
  await answerButton(page, "c").click();
  await expect(page.getByText("Answer locked")).toBeVisible();
  await expect(answerButton(page, "c")).toHaveAttribute("aria-pressed", "true");
  for (const letter of ["a", "b", "c", "d"]) await expect(answerButton(page, letter)).toBeDisabled();
});

test("S4: when every retry fails the player is asked to tap again", async ({ page, request }) => {
  await joinAs(page, "Finn");
  await apiJoin(request, "Gus");
  await page.route("**/api/answer", (route) => route.abort("connectionreset"));
  await host(request, "start");
  await expect(answerButton(page, "a")).toBeEnabled();
  await answerButton(page, "a").click();
  await expect(page.getByText("Sending…")).toBeVisible();
  // Carbon notification: the first sentence is the bold title, the rest the body text (v1.3.2).
  const failed = page.locator(".cds--inline-notification");
  await expect(failed.locator(".cds--inline-notification__title")).toHaveText("Couldn't send your answer.", { timeout: 10000 });
  await expect(failed.locator(".cds--inline-notification__subtitle")).toHaveText("Tap again.");
  await page.unroute("**/api/answer");
  await answerButton(page, "d").click();
  await expect(page.getByText("Answer locked")).toBeVisible();
  // AA contrast: the text is Carbon's text-primary; only the check icon is green (support-success).
  const locked = page.locator(".answer-locked");
  expect(await locked.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(22, 22, 22)");
  expect(await locked.locator("svg").evaluate((el) => getComputedStyle(el).fill)).toBe("rgb(36, 161, 72)");
  await expect(answerButton(page, "d")).toHaveAttribute("aria-pressed", "true");
});

test("S2/S3: a cut connection shows the banner, reconnects and lands on the current screen", async ({ page, request }) => {
  // Chromium's offline mode leaves an open stream alone, so the test cuts it itself:
  // it keeps a handle on the page's EventSource and fails it the way a dropped network does.
  await page.addInitScript(() => {
    const Native = window.EventSource;
    window.__streams = [];
    window.EventSource = class extends Native {
      constructor(...args) {
        super(...args);
        window.__streams.push(this);
      }
    };
  });
  await joinAs(page, "Hana");
  await apiJoin(request, "Ivo");

  await page.route("**/events*", (route) => route.abort("internetdisconnected"));
  await page.evaluate(() => {
    const stream = window.__streams.at(-1);
    stream.close();
    stream.onerror?.(new Event("error"));
  });
  await expect(page.getByText("Reconnecting…")).toBeVisible();
  await host(request, "start");
  await page.waitForTimeout(1500); // at least one reconnect attempt fails while the network is down
  await page.unroute("**/events*");
  await expect(answerButton(page, "a")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Reconnecting…")).toBeHidden();
});

test("S6: a refreshed player stays in the game", async ({ page, request }) => {
  await joinAs(page, "Jo");
  await apiJoin(request, "Kim");
  await host(request, "start");
  await expect(answerButton(page, "b")).toBeEnabled();
  await answerButton(page, "b").click();
  await expect(page.getByText("Answer locked")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Answer locked")).toBeVisible();
  await expect(answerButton(page, "b")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Your name")).toHaveCount(0);
});

test("after a reset the player is back on Join with a message", async ({ page, request }) => {
  await joinAs(page, "Lea");
  await host(request, "reset");
  await expect(page.getByText("The quiz was reset.", { exact: true })).toBeVisible();
  await expect(page.getByText("Join again to play.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Your name")).toHaveValue("Lea");
});

test("once the quiz has started, a disconnected player can rejoin by name", async ({ browser, page, request }) => {
  await joinAs(page, "Mo");
  await apiJoin(request, "Nia");
  await host(request, "start");
  await page.close();

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const other = await phone.newPage();
  await other.goto("/participant.html");
  await expect(other.getByText("The quiz has started.", { exact: true })).toBeVisible();
  await expect(other.getByText("Playing already? Enter the same name to rejoin.", { exact: true })).toBeVisible();
  await other.getByLabel("Your name").fill("Mo");
  await other.getByRole("button", { name: "Join" }).click();
  await expect(other.locator(".player-chip")).toContainText("Mo");
  await expect(other.getByLabel("Your name")).toHaveCount(0);
  await phone.close();
});
