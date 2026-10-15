const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 4173);
const PUBLIC_DIR = path.join(__dirname, "public");
const QUESTIONS_DIR = path.join(__dirname, "questions");

const COUNTDOWN_MS = Number(process.env.COUNTDOWN_MS || 3000);
const DEFAULT_ANSWER_MS = 15000;
const MIN_ANSWER_MS = 5000;
const MAX_ANSWER_MS = 30000;
const HEARTBEAT_MS = 10000;
const MAX_BODY_BYTES = 10 * 1024;
const HOST_PIN = String(process.env.HOST_PIN || "");
const PUBLIC_URL = String(process.env.PUBLIC_URL || "").trim();
const HOST_ACTIONS = new Set(["start", "reveal", "leaderboard", "next", "reset", "final-reveal", "set-question-set", "set-answer-time"]);
const AVATAR_IDS = new Set([
  "us-eagle",
  "us-hotdog",
  "us-statue",
  "ca-beaver",
  "ca-leaf",
  "ca-moose",
  "mx-cactus",
  "mx-chili",
  "mx-taco"
]);

const questionSets = loadQuestionSets();

const initialState = () => ({
  phase: "lobby",
  questionSetId: "test",
  answerMs: DEFAULT_ANSWER_MS,
  currentQuestionIndex: 0,
  finalRevealStage: 0,
  phaseStartedAt: null,
  phaseEndsAt: null,
  participants: {},
  lastQuestionSummary: null
});

let state = initialState();
let timers = [];
// Each open stream: { res, participantId } (participantId is null for host and big screen).
const clients = new Set();

function loadQuestionSets() {
  return {
    test: {
      id: "test",
      name: "Test questions",
      questions: parseQuestionMarkdown(path.join(QUESTIONS_DIR, "test.md"))
    },
    real: {
      id: "real",
      name: "Real questions",
      questions: parseQuestionMarkdown(path.join(QUESTIONS_DIR, "real.md"))
    }
  };
}

function parseQuestionMarkdown(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const blocks = text.split(/^## Question\s+\d+\s*$/gm).slice(1);
  if (!blocks.length) throw new Error(`No questions found in ${filePath}`);

  return blocks.map((block, index) => {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const values = {};

    for (const line of lines) {
      const match = line.match(/^(Category|Question|Correct|A|B|C|D)[:.]?\s*(.*)$/i);
      if (match) values[match[1].toUpperCase()] = match[2].trim();
    }

    const missing = ["CATEGORY", "QUESTION", "A", "B", "C", "D", "CORRECT"].filter((key) => !values[key]);
    if (missing.length) {
      throw new Error(`Question ${index + 1} in ${filePath} is missing: ${missing.join(", ")}`);
    }

    const correctLetter = values.CORRECT.toUpperCase();
    const correctIndex = ["A", "B", "C", "D"].indexOf(correctLetter);
    if (correctIndex === -1) {
      throw new Error(`Question ${index + 1} in ${filePath} has invalid correct answer: ${values.CORRECT}`);
    }

    return {
      label: values.CATEGORY,
      text: values.QUESTION,
      options: [values.A, values.B, values.C, values.D],
      correctIndex
    };
  });
}

function activeQuestionSet() {
  return questionSets[state.questionSetId] || questionSets.test;
}

function activeQuestions() {
  return activeQuestionSet().questions;
}

function questionSetSummary() {
  return Object.values(questionSets).map((set) => ({
    id: set.id,
    name: set.name,
    count: set.questions.length
  }));
}

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function isConnected(participantId) {
  for (const client of clients) {
    if (client.participantId === participantId) return true;
  }
  return false;
}

function participantByToken(token) {
  const clean = String(token || "");
  if (!clean) return null;
  return Object.values(state.participants).find((p) => p.token === clean) || null;
}

function publicState() {
  const questions = activeQuestions();
  const questionSet = activeQuestionSet();
  const ranked = leaderboard();
  const participants = Object.values(state.participants).map((p) => {
    const rank = ranked.find((entry) => entry.id === p.id)?.rank;
    const visible = finalRankVisible(rank);
    if (!visible) {
      return {
        id: p.id,
        name: "Locked player",
        avatarId: null,
        score: null,
        answered: false,
        connected: false,
        currentAnswer: null
      };
    }

    return {
      id: p.id,
      name: p.name,
      avatarId: p.avatarId,
      score: p.score,
      answered: Boolean(p.answers[state.currentQuestionIndex]),
      connected: isConnected(p.id),
      currentAnswer: publicAnswerResult(p)
    };
  });

  return {
    phase: state.phase,
    countdownMs: COUNTDOWN_MS,
    answerMs: state.answerMs,
    currentQuestionIndex: state.currentQuestionIndex,
    finalRevealStage: state.finalRevealStage,
    questionSetId: questionSet.id,
    questionSetName: questionSet.name,
    questionSets: questionSetSummary(),
    totalQuestions: questions.length,
    serverNow: Date.now(),
    phaseStartedAt: state.phaseStartedAt,
    phaseEndsAt: state.phaseEndsAt,
    participants,
    leaderboard: publicLeaderboard(ranked),
    question: safeQuestion(),
    lastQuestionSummary: state.lastQuestionSummary
  };
}

function publicAnswerResult(participant) {
  if (state.phase !== "reveal" && state.phase !== "leaderboard" && state.phase !== "finished") return null;
  const answer = participant.answers[state.currentQuestionIndex];
  if (!answer) return { optionIndex: null, correct: false, points: 0, noAnswer: true };
  return {
    optionIndex: answer.optionIndex,
    correct: answer.correct,
    points: answer.points,
    noAnswer: false
  };
}

function safeQuestion() {
  if (state.phase === "lobby" || state.phase === "countdown" || state.phase === "finished") return null;
  const questions = activeQuestions();
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

// Higher score first; equal scores go to the faster total time on correct answers.
// Players equal on both share a rank (1, 1, 3).
function leaderboard() {
  const sorted = Object.values(state.participants)
    .sort((a, b) => b.score - a.score || a.correctMs - b.correctMs || a.name.localeCompare(b.name));
  const entries = [];
  sorted.forEach((p, index) => {
    const previous = sorted[index - 1];
    const sharesWithPrevious = previous && previous.score === p.score && previous.correctMs === p.correctMs;
    const rank = sharesWithPrevious ? entries[index - 1].rank : index + 1;
    entries.push({ rank, id: p.id, name: p.name, avatarId: p.avatarId, score: p.score, tied: false });
  });
  for (const entry of entries) {
    entry.tied = entries.some((other) => other !== entry && other.rank === entry.rank);
  }
  return entries;
}

function finalRankVisible(rank) {
  if (state.phase !== "finished") return true;
  if (!Number.isFinite(rank)) return false;
  const stage = Number(state.finalRevealStage || 0);
  if (stage <= 0) return false;
  if (rank >= 4) return true;
  if (rank === 3) return stage >= 2;
  return stage >= 3;
}

function publicLeaderboard(ranked = leaderboard()) {
  if (state.phase !== "finished") return ranked;
  return ranked.filter((entry) => finalRankVisible(entry.rank));
}

function broadcast() {
  const payload = JSON.stringify(publicState());
  for (const client of clients) {
    sendEvent(client.res, payload);
  }
}

function sendEvent(res, payload) {
  res.write(`data: ${payload}\n\n`);
}

function sendHeartbeat() {
  for (const client of clients) {
    client.res.write(`event: heartbeat\ndata: {}\n\n`);
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
  if (!activeQuestions().length) return;
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
  clearTimers();
  setPhase("answering", state.answerMs);
  timers.push(setTimeout(closeAnswering, state.answerMs));
}

function closeAnswering() {
  if (state.phase !== "answering") return;
  clearTimers();
  setPhase("awaitingReveal");
}

function resetQuestionAnswers() {
  for (const p of Object.values(state.participants)) {
    delete p.answers[state.currentQuestionIndex];
  }
}

function revealAnswer() {
  if (state.phase !== "awaitingReveal") return;
  const questions = activeQuestions();
  const q = questions[state.currentQuestionIndex];
  const participants = Object.values(state.participants);

  // Scores change only here, so nothing in the shared state hints at correctness before the reveal.
  for (const p of participants) {
    const answer = p.answers[state.currentQuestionIndex];
    if (!answer) continue;
    p.score += answer.points;
    if (answer.correct) p.correctMs += answer.elapsedMs;
  }

  const optionCounts = q.options.map((_, optionIndex) =>
    participants.filter((p) => p.answers[state.currentQuestionIndex]?.optionIndex === optionIndex).length
  );
  const correct = participants.filter((p) => p.answers[state.currentQuestionIndex]?.correct).length;
  const missed = participants.filter((p) => !p.answers[state.currentQuestionIndex]).length;
  state.lastQuestionSummary = {
    correctAnswer: q.options[q.correctIndex],
    correctIndex: q.correctIndex,
    optionCounts,
    correct,
    missed,
    total: participants.length
  };
  setPhase("reveal");
}

function showLeaderboard() {
  if (state.phase !== "reveal") return;
  const questions = activeQuestions();
  if (state.currentQuestionIndex >= questions.length - 1) {
    finishQuiz();
    return;
  }
  setPhase("leaderboard");
}

function nextQuestion() {
  if (state.phase !== "leaderboard") return;
  const questions = activeQuestions();
  if (state.currentQuestionIndex >= questions.length - 1) {
    finishQuiz();
    return;
  }
  state.currentQuestionIndex += 1;
  startCountdown();
}

function finishQuiz() {
  state.finalRevealStage = 0;
  setPhase("finished");
}

function advanceFinalReveal() {
  if (state.phase !== "finished") return;
  state.finalRevealStage = Math.min(3, Number(state.finalRevealStage || 0) + 1);
  broadcast();
}

function setQuestionSet(questionSetId) {
  const clean = String(questionSetId || "").trim();
  if (!questionSets[clean]) return { ok: false, message: "Unknown question set." };
  if (state.phase !== "lobby") return { ok: false, message: "Question set can only be changed in the lobby." };

  state.questionSetId = clean;
  state.currentQuestionIndex = 0;
  state.lastQuestionSummary = null;
  state.finalRevealStage = 0;
  broadcast();
  return { ok: true, questionSetId: clean };
}

function setAnswerTime(answerSeconds) {
  if (state.phase !== "lobby") return { ok: false, message: "Answer time can only be changed in the lobby." };

  const seconds = Number(answerSeconds);
  if (!Number.isFinite(seconds)) return { ok: false, message: "Choose an answer time." };

  const cleanMs = Math.round(seconds) * 1000;
  if (cleanMs < MIN_ANSWER_MS || cleanMs > MAX_ANSWER_MS) {
    return { ok: false, message: "Answer time must be between 5 and 30 seconds." };
  }

  state.answerMs = cleanMs;
  broadcast();
  return { ok: true, answerMs: state.answerMs };
}

function finalPreviewState() {
  return {
    ok: true,
    finalRevealStage: state.finalRevealStage,
    leaderboard: leaderboard()
  };
}

function answerQuestion(token, rawOptionIndex) {
  const optionIndex = rawOptionIndex;
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 3) {
    return { ok: false, status: 400, message: "Choose one of the four answers." };
  }
  const participant = participantByToken(token);
  if (!participant) return { ok: false, status: 403, message: "Player not found. Join again." };
  const existing = participant.answers[state.currentQuestionIndex];
  // The first recorded answer always wins, even if the window has closed since.
  if (existing) return { ok: true, optionIndex: existing.optionIndex };
  if (state.phase !== "answering") return { ok: false, status: 409, message: "The answer window is closed." };

  const questions = activeQuestions();
  const q = questions[state.currentQuestionIndex];
  const answeredAt = Date.now();
  const elapsedMs = Math.max(0, answeredAt - state.phaseStartedAt);
  const correct = optionIndex === q.correctIndex;
  const ratio = Math.max(0, Math.min(1, elapsedMs / state.answerMs));
  const points = correct ? Math.round(250 + 750 * (1 - ratio)) : 0;

  participant.answers[state.currentQuestionIndex] = {
    optionIndex,
    correct,
    points,
    elapsedMs,
    answeredAt
  };

  const everyoneAnswered = Object.values(state.participants).every((p) => p.answers[state.currentQuestionIndex]);
  if (everyoneAnswered) {
    closeAnswering();
  } else {
    broadcast();
  }
  return { ok: true, optionIndex };
}

function normalizeAvatarId(avatarId) {
  const clean = String(avatarId || "").trim();
  return AVATAR_IDS.has(clean) ? clean : "us-eagle";
}

function join(name, avatarId) {
  const clean = String(name || "").trim().slice(0, 28);
  if (!clean) return { ok: false, message: "Enter a name." };
  const existing = Object.values(state.participants).find((p) => p.name.toLowerCase() === clean.toLowerCase());
  if (existing) {
    if (isConnected(existing.id)) return { ok: false, message: "That name is already taken." };
    // Rejoin: a disconnected player is taken over, score included. A new token locks out the old device.
    existing.token = crypto.randomBytes(24).toString("base64url");
    broadcast();
    return { ok: true, id: existing.id, token: existing.token, rejoined: true };
  }
  if (state.phase !== "lobby") {
    return { ok: false, message: "The quiz has started. Playing already? Enter the same name to rejoin." };
  }
  const id = crypto.randomUUID();
  const token = crypto.randomBytes(24).toString("base64url");
  state.participants[id] = { id, token, name: clean, avatarId: normalizeAvatarId(avatarId), score: 0, correctMs: 0, answers: {} };
  broadcast();
  return { ok: true, id, token, rejoined: false };
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

// The address phones should open: PUBLIC_URL if set, else the address this request came in on.
// On localhost that address is useless to a phone, so the laptop's network IP is used instead.
function joinUrl(req) {
  if (PUBLIC_URL) return `${PUBLIC_URL.replace(/\/+$/, "")}/`;
  const proto = String(req.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || `localhost:${PORT}`).split(",")[0].trim();
  const match = host.match(/^(\[[^\]]+\]|[^:]+)(?::(\d+))?$/);
  const hostname = match ? match[1] : host;
  const port = match && match[2] ? `:${match[2]}` : "";
  if (["localhost", "127.0.0.1", "[::1]"].includes(hostname.toLowerCase())) {
    return `${proto}://${localIp()}${port}/`;
  }
  return `${proto}://${host}/`;
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function sendResult(res, result) {
  const { status, ...body } = result;
  sendJson(res, body, status || 200);
}

function pinMatches(submittedPin) {
  const a = crypto.createHash("sha256").update(submittedPin).digest();
  const b = crypto.createHash("sha256").update(HOST_PIN).digest();
  return crypto.timingSafeEqual(a, b);
}

function authorizeHostAction(body) {
  if (!HOST_PIN) return { ok: true };
  const submittedPin = String(body.hostPin || "");
  if (!submittedPin) return { ok: false, message: "Enter the host PIN." };
  if (!pinMatches(submittedPin)) return { ok: false, message: "Host PIN is incorrect." };
  return { ok: true };
}

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

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
    const type = CONTENT_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
}

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new RequestError(413, "Request is too large.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return body && typeof body === "object" ? body : {};
  } catch {
    throw new RequestError(400, "Invalid request.");
  }
}

function openEventStream(req, res, url) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  });
  res.flushHeaders();
  const participant = participantByToken(url.searchParams.get("token"));
  const client = { res, participantId: participant ? participant.id : null };
  const wasConnected = participant ? isConnected(participant.id) : true;
  clients.add(client);
  if (!wasConnected) {
    broadcast();
  } else {
    sendEvent(res, JSON.stringify(publicState()));
  }
  req.on("close", () => {
    clients.delete(client);
    if (client.participantId && !isConnected(client.participantId)) broadcast();
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/events") {
    openEventStream(req, res, url);
    return;
  }

  if (url.pathname === "/api/host-status") {
    return sendJson(res, { hostPinRequired: Boolean(HOST_PIN) });
  }

  if (url.pathname === "/api/join-info") return sendJson(res, { joinUrl: joinUrl(req) });

  if (url.pathname === "/api/state") return sendJson(res, publicState());

  if (req.method === "POST" && url.pathname.startsWith("/api/")) {
    try {
      const body = await readBody(req);
      const action = url.pathname.slice("/api/".length);

      if (action === "join") return sendJson(res, join(body.name, body.avatarId));
      if (action === "answer") return sendResult(res, answerQuestion(body.token, body.optionIndex));
      if (action === "host-unlock") {
        const auth = authorizeHostAction(body);
        return sendJson(res, auth, auth.ok ? 200 : 403);
      }
      if (action === "final-preview") {
        const auth = authorizeHostAction(body);
        if (!auth.ok) return sendJson(res, auth, 403);
        return sendJson(res, finalPreviewState());
      }
      if (HOST_ACTIONS.has(action)) {
        const auth = authorizeHostAction(body);
        if (!auth.ok) return sendJson(res, auth, 403);
      }
      if (action === "start") { startQuiz(); return sendJson(res, { ok: true }); }
      if (action === "reveal") { revealAnswer(); return sendJson(res, { ok: true }); }
      if (action === "leaderboard") { showLeaderboard(); return sendJson(res, { ok: true }); }
      if (action === "next") { nextQuestion(); return sendJson(res, { ok: true }); }
      if (action === "final-reveal") { advanceFinalReveal(); return sendJson(res, { ok: true, finalRevealStage: state.finalRevealStage }); }
      if (action === "set-question-set") return sendJson(res, setQuestionSet(body.questionSetId));
      if (action === "set-answer-time") return sendJson(res, setAnswerTime(body.answerSeconds));
      if (action === "reset") { resetQuiz(); return sendJson(res, { ok: true }); }
      return sendJson(res, { ok: false, message: "Unknown action." }, 404);
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 400;
      res.setHeader("Connection", "close");
      return sendJson(res, { ok: false, message: error instanceof RequestError ? error.message : "Invalid request." }, status);
    }
  }

  serveStatic(req, res);
});

setInterval(sendHeartbeat, HEARTBEAT_MS);

server.listen(PORT, "0.0.0.0", () => {
  const port = server.address().port;
  const hostUrl = `http://localhost:${port}/host.html`;
  const phoneUrl = PUBLIC_URL ? `${PUBLIC_URL.replace(/\/+$/, "")}/` : `http://${localIp()}:${port}/participant.html`;
  console.log(`Host view: ${hostUrl}`);
  console.log(`Participant link for phones: ${phoneUrl}`);
  if (!HOST_PIN) {
    console.warn("WARNING: HOST_PIN is not set. Anyone who opens the host page can control the quiz. Set HOST_PIN before the event.");
  }
});
