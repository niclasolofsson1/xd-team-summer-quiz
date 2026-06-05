const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 4173);
const PUBLIC_DIR = path.join(__dirname, "public");

const COUNTDOWN_MS = 3000;
const ANSWER_MS = 10000;
const HEARTBEAT_MS = 15000;
const HOST_PIN = String(process.env.HOST_PIN || "");
const HOST_ACTIONS = new Set(["start", "reveal", "leaderboard", "next", "reset"]);

const questions = [
  {
    label: "World Cup 2026",
    text: "How many countries are hosting the 2026 FIFA World Cup?",
    options: ["1", "2", "3", "4"],
    correctIndex: 2
  },
  {
    label: "Canada",
    text: "Which Canadian city is one of the 2026 World Cup host cities?",
    options: ["Ottawa", "Toronto", "Calgary", "Quebec City"],
    correctIndex: 1
  },
  {
    label: "Mexico",
    text: "Which Mexican city will host the 2026 World Cup opening match?",
    options: ["Guadalajara", "Monterrey", "Mexico City", "Cancun"],
    correctIndex: 2
  }
];

const initialState = () => ({
  phase: "lobby",
  currentQuestionIndex: 0,
  phaseStartedAt: null,
  phaseEndsAt: null,
  participants: {},
  lastQuestionSummary: null
});

let state = initialState();
let timers = [];
const clients = new Set();

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function publicState() {
  const participants = Object.values(state.participants).map((p) => ({
    id: p.id,
    name: p.name,
    score: p.score,
    answered: Boolean(p.answers[state.currentQuestionIndex])
  }));

  return {
    phase: state.phase,
    countdownMs: COUNTDOWN_MS,
    answerMs: ANSWER_MS,
    currentQuestionIndex: state.currentQuestionIndex,
    totalQuestions: questions.length,
    phaseStartedAt: state.phaseStartedAt,
    phaseEndsAt: state.phaseEndsAt,
    participants,
    leaderboard: leaderboard(),
    question: safeQuestion(),
    lastQuestionSummary: state.lastQuestionSummary
  };
}

function safeQuestion() {
  if (state.phase === "lobby" || state.phase === "countdown" || state.phase === "finished") return null;
  const q = questions[state.currentQuestionIndex];
  const base = {
    label: q.label,
    text: q.text,
    options: q.options
  };

  if (state.phase === "reveal" || state.phase === "leaderboard") {
    base.correctIndex = q.correctIndex;
  }

  return base;
}

function leaderboard() {
  return Object.values(state.participants)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((p, index) => ({ rank: index + 1, id: p.id, name: p.name, score: p.score }));
}

function broadcast() {
  const payload = JSON.stringify(publicState());
  for (const res of clients) {
    sendEvent(res, payload);
  }
}

function sendEvent(res, payload) {
  res.write(`data: ${payload}\n\n`);
}

function sendHeartbeat() {
  for (const res of clients) {
    res.write(`event: heartbeat\ndata: {}\n\n`);
  }
}

function setPhase(phase, durationMs = null) {
  state.phase = phase;
  state.phaseStartedAt = Date.now();
  state.phaseEndsAt = durationMs ? state.phaseStartedAt + durationMs : null;
  broadcast();
}

function startQuiz() {
  if (state.phase !== "lobby" || Object.keys(state.participants).length === 0) return;
  state.currentQuestionIndex = 0;
  state.lastQuestionSummary = null;
  startCountdown();
}

function startCountdown() {
  clearTimers();
  resetQuestionAnswers();
  setPhase("countdown", COUNTDOWN_MS);
  timers.push(setTimeout(startAnswering, COUNTDOWN_MS));
}

function startAnswering() {
  setPhase("answering", ANSWER_MS);
  timers.push(setTimeout(() => setPhase("awaitingReveal"), ANSWER_MS));
}

function resetQuestionAnswers() {
  for (const p of Object.values(state.participants)) {
    delete p.answers[state.currentQuestionIndex];
  }
}

function revealAnswer() {
  if (state.phase !== "awaitingReveal") return;
  const q = questions[state.currentQuestionIndex];
  const participants = Object.values(state.participants);
  const correct = participants.filter((p) => p.answers[state.currentQuestionIndex]?.correct).length;
  const missed = participants.filter((p) => !p.answers[state.currentQuestionIndex]).length;
  state.lastQuestionSummary = {
    correctAnswer: q.options[q.correctIndex],
    correctIndex: q.correctIndex,
    correct,
    missed,
    total: participants.length
  };
  setPhase("reveal");
}

function showLeaderboard() {
  if (state.phase !== "reveal") return;
  if (state.currentQuestionIndex >= questions.length - 1) {
    setPhase("finished");
    return;
  }
  setPhase("leaderboard");
}

function nextQuestion() {
  if (state.phase !== "leaderboard") return;
  if (state.currentQuestionIndex >= questions.length - 1) {
    setPhase("finished");
    return;
  }
  state.currentQuestionIndex += 1;
  startCountdown();
}

function answerQuestion(id, optionIndex) {
  if (state.phase !== "answering") return { ok: false, message: "The answer window is closed." };
  const participant = state.participants[id];
  if (!participant) return { ok: false, message: "Participant not found." };
  if (participant.answers[state.currentQuestionIndex]) return { ok: true };

  const q = questions[state.currentQuestionIndex];
  const answeredAt = Date.now();
  const elapsed = Math.max(0, answeredAt - state.phaseStartedAt);
  const correct = optionIndex === q.correctIndex;
  const ratio = Math.max(0, Math.min(1, elapsed / ANSWER_MS));
  const points = correct ? Math.round(250 + 750 * (1 - ratio)) : 0;

  participant.answers[state.currentQuestionIndex] = {
    optionIndex,
    correct,
    points,
    answeredAt
  };
  participant.score += points;
  broadcast();
  return { ok: true };
}

function join(name) {
  const clean = String(name || "").trim().slice(0, 28);
  if (!clean) return { ok: false, message: "Enter a name." };
  if (state.phase !== "lobby") return { ok: false, message: "The quiz has already started." };
  const existing = Object.values(state.participants).find((p) => p.name.toLowerCase() === clean.toLowerCase());
  if (existing) return { ok: false, message: "That name is already taken." };
  const id = crypto.randomUUID();
  state.participants[id] = { id, name: clean, score: 0, answers: {} };
  broadcast();
  return { ok: true, id };
}

function resetQuiz() {
  clearTimers();
  state = initialState();
  broadcast();
}

function localIp() {
  const nets = os.networkInterfaces();
  for (const addresses of Object.values(nets)) {
    for (const address of addresses || []) {
      if (address.family === "IPv4" && !address.internal) return address.address;
    }
  }
  return "localhost";
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function authorizeHostAction(body) {
  if (!HOST_PIN) return { ok: true };
  const submittedPin = String(body.hostPin || "");
  if (!submittedPin) return { ok: false, message: "Enter the host PIN." };
  if (submittedPin !== HOST_PIN) return { ok: false, message: "Host PIN is incorrect." };
  return { ok: true };
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/") {
    res.writeHead(302, { Location: "/participant.html" });
    res.end();
    return;
  }

  const pathname = url.pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript",
      ".svg": "image/svg+xml"
    }[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });
    clients.add(res);
    sendEvent(res, JSON.stringify(publicState()));
    req.on("close", () => clients.delete(res));
    return;
  }

  if (url.pathname === "/api/host-status") {
    return sendJson(res, { hostPinRequired: Boolean(HOST_PIN) });
  }

  if (url.pathname === "/api/state") return sendJson(res, publicState());

  if (req.method === "POST" && url.pathname.startsWith("/api/")) {
    try {
      const body = await readBody(req);
      const action = url.pathname.slice("/api/".length);

      if (action === "join") return sendJson(res, join(body.name));
      if (action === "answer") return sendJson(res, answerQuestion(body.id, Number(body.optionIndex)));
      if (action === "host-unlock") {
        const auth = authorizeHostAction(body);
        return sendJson(res, auth, auth.ok ? 200 : 403);
      }
      if (HOST_ACTIONS.has(action)) {
        const auth = authorizeHostAction(body);
        if (!auth.ok) return sendJson(res, auth, 403);
      }
      if (action === "start") { startQuiz(); return sendJson(res, { ok: true }); }
      if (action === "reveal") { revealAnswer(); return sendJson(res, { ok: true }); }
      if (action === "leaderboard") { showLeaderboard(); return sendJson(res, { ok: true }); }
      if (action === "next") { nextQuestion(); return sendJson(res, { ok: true }); }
      if (action === "reset") { resetQuiz(); return sendJson(res, { ok: true }); }
      return sendJson(res, { ok: false, message: "Unknown action." }, 404);
    } catch (error) {
      return sendJson(res, { ok: false, message: error.message }, 400);
    }
  }

  serveStatic(req, res);
});

setInterval(sendHeartbeat, HEARTBEAT_MS);

server.listen(PORT, "0.0.0.0", () => {
  const hostUrl = `http://localhost:${PORT}/host.html`;
  const phoneUrl = `http://${localIp()}:${PORT}/participant.html`;
  console.log(`Host view: ${hostUrl}`);
  console.log(`Participant link for phones on the same network: ${phoneUrl}`);
});
