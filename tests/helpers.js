// Shared helpers for the server tests and the player simulation:
// start the real server on a free port, talk to it over HTTP, and follow its event stream.
const { spawn } = require("node:child_process");
const path = require("node:path");

const SERVER_FILE = path.join(__dirname, "..", "server.js");

function startServer(env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SERVER_FILE], {
      env: { ...process.env, PORT: "0", HOST_PIN: "", PUBLIC_URL: "", ...env },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    const onData = (chunk) => {
      output += chunk.toString();
      const match = output.match(/Host view: http:\/\/localhost:(\d+)/);
      if (match) {
        child.stdout.off("data", onData);
        resolve({
          base: `http://127.0.0.1:${match[1]}`,
          output: () => output,
          stop: () => new Promise((done) => {
            if (child.exitCode !== null) return done();
            child.once("exit", () => done());
            child.kill();
          })
        });
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", (chunk) => { output += chunk.toString(); });
    child.once("exit", (code) => reject(new Error(`Server exited early (${code}):\n${output}`)));
  });
}

async function post(base, action, body = {}, { raw } = {}) {
  const res = await fetch(`${base}/api/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw !== undefined ? raw : JSON.stringify(body)
  });
  const data = await res.json();
  return { status: res.status, ...data };
}

async function getJson(base, pathname) {
  const res = await fetch(`${base}${pathname}`);
  return res.json();
}

// Follows /events. Keeps the latest state and every phase seen (as "phase:questionIndex").
function openStream(base, token = "") {
  const controller = new AbortController();
  const stream = {
    state: null,
    phasesSeen: new Set(),
    messages: 0,
    error: null,
    closed: false,
    listeners: new Set(),
    close() {
      stream.closed = true;
      controller.abort();
    },
    waitFor(predicate, timeoutMs = 5000, label = "condition") {
      if (stream.state && predicate(stream.state)) return Promise.resolve(stream.state);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          stream.listeners.delete(check);
          reject(new Error(`Timed out waiting for ${label} (phase: ${stream.state?.phase})`));
        }, timeoutMs);
        const check = (state) => {
          if (!predicate(state)) return;
          clearTimeout(timer);
          stream.listeners.delete(check);
          resolve(state);
        };
        stream.listeners.add(check);
      });
    }
  };

  stream.ready = (async () => {
    const url = token ? `${base}/events?token=${encodeURIComponent(token)}` : `${base}/events`;
    const res = await fetch(url, { signal: controller.signal });
    stream.headers = res.headers;
    return res;
  })();

  stream.done = stream.ready.then(async (res) => {
    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let index;
      while ((index = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        if (block.startsWith("event:")) continue;
        const dataLine = block.split("\n").find((line) => line.startsWith("data: "));
        if (!dataLine) continue;
        const state = JSON.parse(dataLine.slice(6));
        stream.state = state;
        stream.messages += 1;
        stream.phasesSeen.add(`${state.phase}:${state.currentQuestionIndex}`);
        for (const listener of [...stream.listeners]) listener(state);
      }
    }
  }).catch((error) => {
    if (!stream.closed) stream.error = error;
  });

  return stream;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { startServer, post, getJson, openStream, sleep };

// Correct option index per question, read straight from the question file.
function correctAnswers(setId = "test") {
  const fs = require("node:fs");
  const text = fs.readFileSync(path.join(__dirname, "..", "questions", `${setId}.md`), "utf8");
  return [...text.matchAll(/^Correct[:.]?\s*([A-D])/gim)].map((m) => "ABCD".indexOf(m[1].toUpperCase()));
}

module.exports.correctAnswers = correctAnswers;
