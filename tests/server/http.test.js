const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { startServer, post, getJson, openStream } = require("../helpers");

const running = [];
after(async () => { await Promise.all(running.map((s) => s.stop())); });

async function start(env) {
  const server = await startServer(env);
  running.push(server);
  return server;
}

function getWithHeaders(base, pathname, headers) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${base}${pathname}`, { headers }, (res) => {
      let body = "";
      res.on("data", (c) => { body += c; });
      res.on("end", () => resolve(JSON.parse(body)));
    });
    req.on("error", reject);
  });
}

test("request bodies over 10 KB are refused, broken JSON is a 400", async () => {
  const server = await start();
  const big = await post(server.base, "join", { name: "x".repeat(11 * 1024) });
  assert.equal(big.status, 413);
  const broken = await post(server.base, "join", {}, { raw: "{not json" });
  assert.equal(broken.status, 400);
  assert.equal(broken.message, "Invalid request.");
});

test("host actions need the right PIN", async () => {
  const server = await start({ HOST_PIN: "4321" });
  assert.ok(!server.output().includes("HOST_PIN is not set"));
  assert.equal((await getJson(server.base, "/api/host-status")).hostPinRequired, true);
  assert.equal((await post(server.base, "reset", {})).status, 403);
  assert.equal((await post(server.base, "reset", { hostPin: "1234" })).status, 403);
  assert.equal((await post(server.base, "reset", { hostPin: "43210" })).status, 403);
  assert.equal((await post(server.base, "reset", { hostPin: "4321" })).ok, true);
  assert.equal((await post(server.base, "host-unlock", { hostPin: "4321" })).ok, true);
});

test("the server warns at startup when HOST_PIN is missing", async () => {
  const server = await start({ HOST_PIN: "" });
  await new Promise((r) => setTimeout(r, 100));
  assert.match(server.output(), /WARNING: HOST_PIN is not set/);
});

test("join address: PUBLIC_URL, then the request host, never localhost", async () => {
  const withUrl = await start({ PUBLIC_URL: "https://quiz.example.com/" });
  assert.equal((await getJson(withUrl.base, "/api/join-info")).joinUrl, "https://quiz.example.com/");

  const server = await start();
  const proxied = await getWithHeaders(server.base, "/api/join-info", { Host: "xd-quiz.onrender.com", "X-Forwarded-Proto": "https" });
  assert.equal(proxied.joinUrl, "https://xd-quiz.onrender.com/");
  const local = await getWithHeaders(server.base, "/api/join-info", { Host: "localhost:4173" });
  assert.match(local.joinUrl, /^http:\/\/[^/]+:4173\/$/);
  assert.ok(!local.joinUrl.includes("localhost"));
});

test("fonts get the right content type and the stream has anti-buffering headers", async () => {
  const server = await start();
  const font = await fetch(`${server.base}/assets/fonts/NunitoBlack.woff2`);
  assert.equal(font.headers.get("content-type"), "font/woff2");
  await font.arrayBuffer();

  const stream = openStream(server.base);
  await stream.ready;
  assert.equal(stream.headers.get("content-type"), "text/event-stream");
  assert.equal(stream.headers.get("x-accel-buffering"), "no");
  assert.match(stream.headers.get("cache-control"), /no-transform/);
  await stream.waitFor((s) => s.phase === "lobby");
  stream.close();
});

test("the built player app is served first, the arcade host and big screen still come from public/", async () => {
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), "quiz-dist-"));
  fs.mkdirSync(path.join(dist, "app"));
  fs.writeFileSync(path.join(dist, "participant.html"), "<!doctype html><p>carbon player</p>");
  fs.writeFileSync(path.join(dist, "app", "participant-abc123.js"), "console.log(1)");
  const server = await start({ QUIZ_DIST_DIR: dist });

  const player = await fetch(`${server.base}/participant.html`);
  assert.match(await player.text(), /carbon player/);
  assert.equal(player.headers.get("cache-control"), "no-cache");
  const asset = await fetch(`${server.base}/app/participant-abc123.js`);
  assert.match(asset.headers.get("cache-control"), /immutable/);
  await asset.text();
  // Not in dist/: falls back to the arcade big screen in public/ (until v1.4.0).
  const display = await fetch(`${server.base}/display.html`);
  assert.equal(display.status, 200);
  assert.match(await display.text(), /data-view="display"/);
  const missing = await fetch(`${server.base}/nope.html`);
  assert.equal(missing.status, 404);
  await missing.text();
  assert.ok(!server.output().includes("isn't built"));
});

test("the server warns at startup when the player app isn't built", async () => {
  const server = await start({ QUIZ_DIST_DIR: require("node:path").join(require("node:os").tmpdir(), "quiz-no-dist") });
  await new Promise((r) => setTimeout(r, 100));
  assert.match(server.output(), /WARNING: The player app isn't built/);
});

test("unknown avatars fall back to the first emoji avatar", async () => {
  const server = await start();
  await post(server.base, "join", { name: "Ada", avatarId: "dragon" });
  await post(server.base, "join", { name: "Bo", avatarId: "owl" });
  const state = await getJson(server.base, "/api/state");
  assert.deepEqual(state.participants.map((p) => p.avatarId), ["fox", "owl"]);
});
