const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 4173);
const PUBLIC_DIR = path.join(__dirname, "public");
const QUESTIONS_DIR = path.join(__dirname, "questions");

const COUNTDOWN_MS = 3000;
const DEFAULT_ANSWER_MS = 15000;
const MIN_ANSWER_MS = 5000;
const MAX_ANSWER_MS = 30000;
const HEARTBEAT_MS = 15000;
const HOST_PIN = String(process.env.HOST_PIN || "");
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
        currentAnswer: null
      };
    }

    return {
      id: p.id,
      name: p.name,
      avatarId: p.avatarId,
      score: p.score,
      answered: Boolean(p.answers[state.currentQuestionIndex]),
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
  if (!answer) return { optionIndex: null, correct: false, points: 0 };
  return {
    optionIndex: answer.optionIndex,
    correct: answer.correct,
    points: answer.points
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

function leaderboard() {
  return Object.values(state.participants)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((p, index) => ({ rank: index + 1, id: p.id, name: p.name, avatarId: p.avatarId, score: p.score }));
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
  setPhase("answering", state.answerMs);
  timers.push(setTimeout(() => setPhase("awaitingReveal"), state.answerMs));
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

function answerQuestion(id, optionIndex) {
  if (state.phase !== "answering") return { ok: false, message: "The answer window is closed." };
  const participant = state.participants[id];
  if (!participant) return { ok: false, message: "Participant not found." };
  if (participant.answers[state.currentQuestionIndex]) return { ok: true };

  const questions = activeQuestions();
  const q = questions[state.currentQuestionIndex];
  const answeredAt = Date.now();
  const elapsed = Math.max(0, answeredAt - state.phaseStartedAt);
  const correct = optionIndex === q.correctIndex;
  const ratio = Math.max(0, Math.min(1, elapsed / state.answerMs));
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

function normalizeAvatarId(avatarId) {
  const clean = String(avatarId || "").trim();
  return AVATAR_IDS.has(clean) ? clean : "us-eagle";
}

function join(name, avatarId) {
  const clean = String(name || "").trim().slice(0, 28);
  if (!clean) return { ok: false, message: "Enter a name." };
  if (state.phase !== "lobby") return { ok: false, message: "The quiz has already started." };
  const existing = Object.values(state.participants).find((p) => p.name.toLowerCase() === clean.toLowerCase());
  if (existing) return { ok: false, message: "That name is already taken." };
  const id = crypto.randomUUID();
  state.participants[id] = { id, name: clean, avatarId: normalizeAvatarId(avatarId), score: 0, answers: {} };
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
      ".png": "image/png",
      ".webp": "image/webp",
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

      if (action === "join") return sendJson(res, join(body.name, body.avatarId));
      if (action === "answer") return sendJson(res, answerQuestion(body.id, Number(body.optionIndex)));
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
