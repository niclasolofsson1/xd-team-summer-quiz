const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { startServer, post, getJson, openStream, sleep, correctAnswers } = require("../helpers");

const CORRECT = correctAnswers("test");
let server;
let streams;

beforeEach(async () => {
  server = await startServer({ COUNTDOWN_MS: "50" });
  streams = [];
});

afterEach(async () => {
  streams.forEach((s) => s.close());
  await server.stop();
});

function watch(token = "") {
  const stream = openStream(server.base, token);
  streams.push(stream);
  return stream;
}

async function joinConnected(name) {
  const player = await post(server.base, "join", { name, avatarId: "ca-moose" });
  assert.equal(player.ok, true, player.message);
  player.stream = watch(player.token);
  await player.stream.waitFor((s) => s.participants.find((p) => p.id === player.id)?.connected, 3000, `${name} connected`);
  return player;
}

const wrong = (index) => (CORRECT[index] + 1) % 4;

test("join returns a public id and a secret token that never appears in the shared state", async () => {
  const player = await post(server.base, "join", { name: "Ada" });
  assert.equal(player.ok, true);
  assert.match(player.id, /^[0-9a-f-]{36}$/);
  assert.ok(player.token.length >= 24);
  const state = await getJson(server.base, "/api/state");
  assert.equal(state.participants[0].id, player.id);
  assert.ok(!JSON.stringify(state).includes(player.token));
});

test("answers need the token, not the id, and the option must be 0-3", async () => {
  const host = watch();
  const ada = await joinConnected("Ada");
  await post(server.base, "start");
  await host.waitFor((s) => s.phase === "answering");

  assert.equal((await post(server.base, "answer", { id: ada.id, optionIndex: 0 })).status, 403);
  assert.equal((await post(server.base, "answer", { token: "not-a-token", optionIndex: 0 })).status, 403);
  for (const optionIndex of [4, -1, 1.5, "a", "1", null, undefined]) {
    const result = await post(server.base, "answer", { token: ada.token, optionIndex });
    assert.equal(result.status, 400, `optionIndex ${optionIndex}`);
  }
  const ok = await post(server.base, "answer", { token: ada.token, optionIndex: 2 });
  assert.deepEqual([ok.status, ok.ok, ok.optionIndex], [200, true, 2]);
});

test("first answer wins, and scores only change at the reveal", async () => {
  const host = watch();
  const ada = await joinConnected("Ada");
  const bo = await joinConnected("Bo");
  await post(server.base, "start");
  await host.waitFor((s) => s.phase === "answering");

  const first = await post(server.base, "answer", { token: ada.token, optionIndex: CORRECT[0] });
  const second = await post(server.base, "answer", { token: ada.token, optionIndex: wrong(0) });
  assert.equal(first.optionIndex, CORRECT[0]);
  assert.equal(second.optionIndex, CORRECT[0], "the reply repeats the recorded option");

  const during = await host.waitFor((s) => s.participants.find((p) => p.id === ada.id).answered);
  assert.equal(during.participants.find((p) => p.id === ada.id).score, 0);
  assert.equal(during.participants.find((p) => p.id === ada.id).currentAnswer, null);

  await post(server.base, "answer", { token: bo.token, optionIndex: wrong(0) });
  const waiting = await host.waitFor((s) => s.phase === "awaitingReveal");
  assert.ok(waiting.participants.every((p) => p.score === 0), "no score before the reveal");
  assert.equal(waiting.question.correctIndex, undefined);

  await post(server.base, "reveal");
  const revealed = await host.waitFor((s) => s.phase === "reveal");
  const adaState = revealed.participants.find((p) => p.id === ada.id);
  assert.ok(adaState.score >= 250);
  assert.equal(adaState.currentAnswer.optionIndex, CORRECT[0]);
  assert.equal(revealed.participants.find((p) => p.id === bo.id).score, 0);
});

test("the answer window ends early when every player has answered", async () => {
  const host = watch();
  const ada = await joinConnected("Ada");
  const bo = await joinConnected("Bo");
  await post(server.base, "start");
  const answering = await host.waitFor((s) => s.phase === "answering");
  await post(server.base, "answer", { token: ada.token, optionIndex: 0 });
  await sleep(100);
  assert.equal(host.state.phase, "answering", "still open while Bo hasn't answered");
  await post(server.base, "answer", { token: bo.token, optionIndex: 1 });
  const closed = await host.waitFor((s) => s.phase === "awaitingReveal", 1000);
  assert.ok(closed.phaseStartedAt < answering.phaseEndsAt, "closed before the timer ran out");
});

test("a player who didn't answer is flagged as no answer", async () => {
  const host = watch();
  await post(server.base, "set-answer-time", { answerSeconds: 5 });
  const ada = await joinConnected("Ada");
  const bo = await joinConnected("Bo");
  await post(server.base, "start");
  await host.waitFor((s) => s.phase === "answering");
  await post(server.base, "answer", { token: ada.token, optionIndex: wrong(0) });
  await host.waitFor((s) => s.phase === "awaitingReveal", 7000);
  await post(server.base, "reveal");
  const revealed = await host.waitFor((s) => s.phase === "reveal");
  assert.deepEqual(revealed.participants.find((p) => p.id === bo.id).currentAnswer,
    { optionIndex: null, correct: false, points: 0, noAnswer: true });
  assert.equal(revealed.participants.find((p) => p.id === ada.id).currentAnswer.noAnswer, false);
  assert.equal(revealed.lastQuestionSummary.missed, 1);
});

test("equal scores share a rank, and the final reveal handles shared ranks", async () => {
  const host = watch();
  const players = [];
  for (const name of ["Ada", "Bo", "Cy", "Di"]) players.push(await joinConnected(name));
  const [ada, ...rest] = players;
  await post(server.base, "start");

  for (let q = 0; q < CORRECT.length; q += 1) {
    await host.waitFor((s) => s.phase === "answering" && s.currentQuestionIndex === q);
    await post(server.base, "answer", { token: ada.token, optionIndex: CORRECT[q] });
    for (const p of rest) await post(server.base, "answer", { token: p.token, optionIndex: wrong(q) });
    await host.waitFor((s) => s.phase === "awaitingReveal");
    await post(server.base, "reveal");
    await host.waitFor((s) => s.phase === "reveal");
    await post(server.base, "leaderboard");
    if (q < CORRECT.length - 1) {
      const board = await host.waitFor((s) => s.phase === "leaderboard");
      assert.deepEqual(board.leaderboard.map((e) => [e.rank, e.tied]), [[1, false], [2, true], [2, true], [2, true]]);
      await post(server.base, "next");
    }
  }

  await host.waitFor((s) => s.phase === "finished");
  const visibleAt = [];
  for (let stage = 1; stage <= 3; stage += 1) {
    await post(server.base, "final-reveal");
    const s = await host.waitFor((st) => st.finalRevealStage === stage);
    visibleAt.push(s.leaderboard.length);
  }
  // Ranks are 1, 2, 2, 2: nobody is rank 3+, so all stay hidden until the last stage.
  assert.deepEqual(visibleAt, [0, 0, 4]);
});

test("rejoin by name works only for a disconnected player and locks out the old token", async () => {
  const host = watch();
  const ada = await joinConnected("Ada");
  await joinConnected("Bo");

  const taken = await post(server.base, "join", { name: "ada" });
  assert.equal(taken.ok, false);
  assert.equal(taken.message, "That name is already taken.");

  await post(server.base, "start");
  await host.waitFor((s) => s.phase === "answering");

  ada.stream.close();
  await host.waitFor((s) => s.participants.find((p) => p.id === ada.id).connected === false, 3000, "Ada disconnected");

  const back = await post(server.base, "join", { name: "Ada" });
  assert.equal(back.ok, true);
  assert.equal(back.rejoined, true);
  assert.equal(back.id, ada.id);
  assert.notEqual(back.token, ada.token);

  assert.equal((await post(server.base, "answer", { token: ada.token, optionIndex: 0 })).status, 403);
  assert.equal((await post(server.base, "answer", { token: back.token, optionIndex: 0 })).ok, true);

  const newcomer = await post(server.base, "join", { name: "Eve" });
  assert.equal(newcomer.ok, false);
  assert.match(newcomer.message, /The quiz has started/);
});

test("presence: a player's connected flag follows their stream", async () => {
  const host = watch();
  const ada = await post(server.base, "join", { name: "Ada" });
  await host.waitFor((s) => s.participants.length === 1);
  assert.equal(host.state.participants[0].connected, false);
  const stream = watch(ada.token);
  await host.waitFor((s) => s.participants[0].connected === true, 3000, "connected");
  stream.close();
  await host.waitFor((s) => s.participants[0].connected === false, 3000, "disconnected");
});
