// Plays a whole quiz with simulated players, to check the server holds up at event size.
//
//   npm run simulate                      starts a local server and plays the real questions
//   npm run simulate -- --players 25 --set test
//   npm run simulate -- --url https://... --pin 1234   runs against a running server (it resets the quiz!)
//
// Built-in disruptions: two players skip questions, two drop their connection and come back,
// one "switches device" by rejoining with the same name. Passes when there are no errors,
// every player saw every phase, and every score matches the points shown at each reveal.
const { startServer, post, openStream, sleep, correctAnswers } = require("../tests/helpers");

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, i, all) => {
  if (arg.startsWith("--")) pairs.push([arg.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "true"]);
  return pairs;
}, []));

const PLAYERS = Number(args.players || 25);
const SET = args.set || "real";
const ANSWER_SECONDS = Number(args["answer-seconds"] || 15);
const SKIPPERS = { 0: [3, 7], 1: [3] };
const DROPPERS = { 2: 5, 3: 5 };
const SWITCHER = { player: 4, question: Math.min(10, correctAnswers(SET).length - 1) };
const EMOJI_AVATARS = ["us-eagle", "us-hotdog", "us-statue", "ca-beaver", "ca-leaf", "ca-moose", "mx-cactus", "mx-chili", "mx-taco"];

const errors = [];
const fail = (message) => { errors.push(message); console.error(`  ✖ ${message}`); };

async function main() {
  const started = Date.now();
  const local = args.url ? null : await startServer({ HOST_PIN: "sim-pin" });
  const base = args.url ? args.url.replace(/\/+$/, "") : local.base;
  const hostPin = args.url ? (args.pin || "") : "sim-pin";
  const hostPost = async (action, body = {}) => {
    const result = await post(base, action, { ...body, hostPin });
    if (!result.ok) fail(`host ${action}: ${result.status} ${result.message}`);
    return result;
  };
  const correct = correctAnswers(SET);
  const total = correct.length;
  console.log(`Simulating ${PLAYERS} players, ${total} questions (${SET}), ${ANSWER_SECONDS}s answer time, on ${base}`);

  const host = openStream(base);
  await hostPost("reset");
  await hostPost("set-question-set", { questionSetId: SET });
  await hostPost("set-answer-time", { answerSeconds: ANSWER_SECONDS });

  const players = [];
  await Promise.all(Array.from({ length: PLAYERS }, async (_, i) => {
    const name = `Player ${String(i + 1).padStart(2, "0")}`;
    const joined = await post(base, "join", { name, avatarId: EMOJI_AVATARS[i % EMOJI_AVATARS.length] });
    if (!joined.ok) return fail(`${name} could not join: ${joined.message}`);
    players[i] = { index: i, name, id: joined.id, token: joined.token, streams: [openStream(base, joined.token)], score: 0 };
  }));
  await host.waitFor((s) => s.participants.length === PLAYERS && s.participants.every((p) => p.connected), 10000, "all players connected");
  console.log(`  ${PLAYERS} players joined and connected`);

  await hostPost("start");

  for (let q = 0; q < total; q += 1) {
    await host.waitFor((s) => s.phase === "answering" && s.currentQuestionIndex === q, 10000, `answering ${q + 1}`);
    const recorded = {};

    await Promise.all(players.map(async (player) => {
      if (SKIPPERS[player.index]?.includes(q)) return;
      if (DROPPERS[player.index] === q) {
        player.streams[player.streams.length - 1].close();
        await sleep(1500);
        player.streams.push(openStream(base, player.token));
      }
      if (SWITCHER.player === player.index && SWITCHER.question === q) {
        player.streams[player.streams.length - 1].close();
        await host.waitFor((s) => s.participants.find((p) => p.id === player.id)?.connected === false, 5000, `${player.name} offline`);
        const oldToken = player.token;
        const rejoined = await post(base, "join", { name: player.name });
        if (!rejoined.ok || rejoined.id !== player.id) return fail(`${player.name} could not rejoin: ${rejoined.message}`);
        player.token = rejoined.token;
        player.streams.push(openStream(base, player.token));
        const stale = await post(base, "answer", { token: oldToken, optionIndex: 0 });
        if (stale.status !== 403) fail(`${player.name}'s old device could still answer`);
      }
      await sleep(300 + Math.random() * 3500);
      const optionIndex = Math.random() < 0.6 ? correct[q] : (correct[q] + 1 + Math.floor(Math.random() * 3)) % 4;
      const result = await post(base, "answer", { token: player.token, optionIndex });
      if (!result.ok || result.optionIndex !== optionIndex) return fail(`${player.name} Q${q + 1} answer: ${result.status} ${result.message || ""}`);
      recorded[player.id] = optionIndex;
    }));

    await host.waitFor((s) => s.phase === "awaitingReveal" && s.currentQuestionIndex === q, ANSWER_SECONDS * 1000 + 5000, `time's up ${q + 1}`);
    await hostPost("reveal");
    const revealed = await host.waitFor((s) => s.phase === "reveal" && s.currentQuestionIndex === q, 5000, `reveal ${q + 1}`);

    for (const player of players) {
      const shown = revealed.participants.find((p) => p.id === player.id);
      const answer = shown.currentAnswer;
      const expectedOption = recorded[player.id] ?? null;
      if (answer.optionIndex !== expectedOption) fail(`${player.name} Q${q + 1}: shown option ${answer.optionIndex}, recorded ${expectedOption}`);
      if (answer.noAnswer !== (expectedOption === null)) fail(`${player.name} Q${q + 1}: wrong no-answer flag`);
      player.score += answer.points;
      if (shown.score !== player.score) fail(`${player.name} Q${q + 1}: score ${shown.score}, expected ${player.score}`);
    }

    await hostPost("leaderboard");
    if (q < total - 1) {
      await host.waitFor((s) => s.phase === "leaderboard" && s.currentQuestionIndex === q, 5000, `leaderboard ${q + 1}`);
      await hostPost("next");
    }
    process.stdout.write(`  Q${q + 1}/${total} ✓\n`);
  }

  await host.waitFor((s) => s.phase === "finished", 5000, "final results");
  for (let stage = 1; stage <= 3; stage += 1) await hostPost("final-reveal");
  const final = await host.waitFor((s) => s.finalRevealStage === 3, 5000, "podium");
  if (final.leaderboard.length !== PLAYERS) fail(`podium shows ${final.leaderboard.length} of ${PLAYERS} players`);
  await sleep(500);

  // Every player must have seen every phase of every question (across reconnects).
  const expected = ["lobby:0"];
  for (let q = 0; q < total; q += 1) {
    expected.push(`countdown:${q}`, `answering:${q}`, `awaitingReveal:${q}`, `reveal:${q}`);
    if (q < total - 1) expected.push(`leaderboard:${q}`);
  }
  expected.push(`finished:${total - 1}`);
  let fullyFollowed = 0;
  for (const player of players) {
    const seen = new Set(player.streams.flatMap((s) => [...s.phasesSeen]));
    const missing = expected.filter((phase) => !seen.has(phase));
    if (missing.length) fail(`${player.name} missed ${missing.length} phases: ${missing.slice(0, 5).join(", ")}`);
    else fullyFollowed += 1;
    for (const s of player.streams) if (s.error) fail(`${player.name} stream error: ${s.error.message}`);
  }

  players.forEach((p) => p.streams.forEach((s) => s.close()));
  host.close();
  if (local) await local.stop();

  const top = final.leaderboard.slice(0, 3).map((e) => `${e.rank}. ${e.name} (${e.score})`).join(", ");
  console.log(`\nPlayers who saw every phase: ${fullyFollowed}/${PLAYERS}`);
  console.log(`Podium: ${top}`);
  console.log(`Duration: ${Math.round((Date.now() - started) / 1000)} s`);
  console.log(errors.length ? `FAILED with ${errors.length} error(s)` : "PASSED: 0 errors");
  process.exit(errors.length ? 1 : 0);
}

main().catch((error) => {
  console.error(`FAILED: ${error.message}`);
  process.exit(1);
});
