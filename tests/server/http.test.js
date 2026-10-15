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
