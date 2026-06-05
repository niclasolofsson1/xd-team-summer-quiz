const app = document.querySelector("#app");
const view = document.body.dataset.view;
const participantKey = "xd-summer-quiz-participant-id";
const hostPinKey = "xd-summer-quiz-host-pin";

let state = null;
let tick = null;
let lastRenderSignature = "";
let connectionStatus = "reconnecting";
let lastEventAt = 0;
let hostAuthMessage = "";
let hostGateMessage = "";

const phaseLabels = {
  lobby: "Lobby",
  countdown: "Get ready",
  answering: "Answer now",
  awaitingReveal: "Waiting for reveal",
  reveal: "Correct answer",
  leaderboard: "Leaderboard",
  finished: "Final results"
};

const optionNames = ["A", "B", "C", "D"];

async function post(action, payload = {}) {
  const res = await fetch(`/api/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function postHostAction(action) {
  const result = await post(action, { hostPin: hostPin() });
  hostAuthMessage = result.ok ? "" : result.message;
  if (!result.ok) render();
  return result;
}

async function startApp() {
  if (view === "host") {
    await startHost();
    return;
  }

  connect();
}

async function startHost() {
  try {
    const status = await getHostStatus();
    if (!status.hostPinRequired) {
      connect();
      return;
    }

    const savedPin = hostPin();
    if (savedPin) {
      const result = await verifyHostPin(savedPin);
      if (result.ok) {
        connect();
        return;
      }
      setHostPin("");
      hostGateMessage = result.message;
    }

    renderHostGate();
  } catch (error) {
    hostGateMessage = "Could not check host access. Refresh and try again.";
    renderHostGate();
  }
}

async function getHostStatus() {
  const res = await fetch("/api/host-status");
  return res.json();
}

async function verifyHostPin(pin) {
  return post("host-unlock", { hostPin: pin });
}

function connect() {
  const events = new EventSource("/events");
  events.onopen = () => {
    markConnectionEvent();
  };
  events.onmessage = (event) => {
    markConnectionEvent();
    state = JSON.parse(event.data);
    render();
  };
  events.addEventListener("heartbeat", () => {
    markConnectionEvent();
  });
  events.onerror = () => {
    updateConnectionStatus("reconnecting");
  };

  clearInterval(tick);
  tick = setInterval(() => {
    renderTimerOnly();
    checkConnectionFreshness();
  }, 250);
}

function markConnectionEvent() {
  lastEventAt = Date.now();
  updateConnectionStatus("connected");
}

function checkConnectionFreshness() {
  if (!lastEventAt) return;
  if (Date.now() - lastEventAt > 45000) {
    updateConnectionStatus("offline");
  }
}

function updateConnectionStatus(nextStatus) {
  if (connectionStatus === nextStatus) return;
  connectionStatus = nextStatus;
  updateConnectionStatusElements();
}

function updateConnectionStatusElements() {
  document.querySelectorAll("[data-connection-status]").forEach((element) => {
    element.textContent = connectionLabel();
    element.className = `connection-pill ${connectionStatus}`;
  });
}

function secondsLeft() {
  if (!state?.phaseEndsAt) return null;
  return Math.max(0, Math.ceil((state.phaseEndsAt - Date.now()) / 1000));
}

function progressPercent() {
  if (!state?.phaseEndsAt || !state?.phaseStartedAt) return 0;
  const total = state.phaseEndsAt - state.phaseStartedAt;
  const left = Math.max(0, state.phaseEndsAt - Date.now());
  return Math.max(0, Math.min(100, (left / total) * 100));
}

function participantId() {
  return localStorage.getItem(participantKey);
}

function hostPin() {
  return sessionStorage.getItem(hostPinKey) || "";
}

function setHostPin(value) {
  const clean = String(value || "").trim();
  if (clean) {
    sessionStorage.setItem(hostPinKey, clean);
  } else {
    sessionStorage.removeItem(hostPinKey);
  }
}

function currentParticipant() {
  const id = participantId();
  return state?.participants.find((p) => p.id === id);
}

function participantAnswer() {
  const id = participantId();
  if (!id) return null;
  return state?.participants.find((p) => p.id === id)?.answered || false;
}

function hostLink() {
  return `${location.origin}/participant.html`;
}

function renderHostGate() {
  app.innerHTML = `
    <main class="landing">
      <section class="panel stack">
        <p class="eyebrow">XD Team Summer Quiz</p>
        <h1>Host access</h1>
        <p class="lede">Enter the host PIN to open the quiz dashboard.</p>
        <form id="host-gate-form" class="stack">
          <div class="field">
            <label for="host-gate-pin">Host PIN</label>
            <input id="host-gate-pin" name="host-gate-pin" type="password" autocomplete="off" required>
          </div>
          <button class="primary" type="submit">Unlock host view</button>
          <p id="host-gate-error" class="form-message error">${escapeHtml(hostGateMessage)}</p>
        </form>
      </section>
    </main>
  `;

  bindHostGate();
}

function bindHostGate() {
  document.querySelector("#host-gate-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const submittedPin = new FormData(event.currentTarget).get("host-gate-pin");
    const result = await verifyHostPin(submittedPin);
    if (result.ok) {
      setHostPin(submittedPin);
      hostGateMessage = "";
      connect();
      return;
    }
    setHostPin("");
    hostGateMessage = result.message;
    renderHostGate();
  });
}

function header() {
  return `
    <div class="topbar">
      <div class="brand">
        <p class="eyebrow">XD Team Summer Quiz</p>
        <h1>${view === "host" ? "Host view" : "Play view"}</h1>
      </div>
      <div class="status-group">
        <span class="status-pill">${phaseLabels[state.phase]}</span>
        ${connectionStatusBlock()}
      </div>
    </div>
  `;
}

function connectionStatusBlock() {
  return `<span class="connection-pill ${connectionStatus}" data-connection-status>${connectionLabel()}</span>`;
}

function connectionLabel() {
  const labels = {
    connected: "Connected",
    reconnecting: "Reconnecting",
    offline: "Offline"
  };
  return labels[connectionStatus] || "Reconnecting";
}

function timerBlock(label) {
  const left = secondsLeft();
  if (left === null) return "";
  return `
    <div class="timer">
      <p class="phase">${label}</p>
      <div class="timer-number" data-timer-number>${left}</div>
      <div class="bar" aria-label="${left} seconds left">
        <span data-timer-bar style="--progress: ${progressPercent()}%"></span>
      </div>
    </div>
  `;
}

function countdownBlock() {
  const left = secondsLeft();
  return `
    <section class="card stack">
      <p class="eyebrow">Question ${state.currentQuestionIndex + 1} of ${state.totalQuestions}</p>
      <h2>Get ready</h2>
      <div class="timer">
        <p class="phase">Starting in</p>
        <div class="timer-number" data-timer-number>${left}</div>
        <div class="bar" aria-label="${left} seconds left">
          <span data-timer-bar style="--progress: ${progressPercent()}%"></span>
        </div>
      </div>
    </section>
  `;
}

function questionBlock(includeOptions = true, interactive = false) {
  const q = state.question;
  if (!q) return "";
  const selected = sessionStorage.getItem(`answer-${state.currentQuestionIndex}`);
  return `
    <section class="card stack">
      <p class="eyebrow">${q.label} · Question ${state.currentQuestionIndex + 1} of ${state.totalQuestions}</p>
      <h2>${escapeHtml(q.text)}</h2>
      ${includeOptions ? `
        <div class="options">
          ${q.options.map((option, index) => {
            const isCorrect = q.correctIndex === index;
            const isSelected = selected === String(index);
            const classes = ["option", isCorrect ? "correct" : "", isSelected ? "selected" : ""].join(" ");
            return `<button class="${classes}" ${interactive ? "" : "disabled"} data-answer="${index}">
              <strong>${optionNames[index]}.</strong> ${escapeHtml(option)}
            </button>`;
          }).join("")}
        </div>
      ` : ""}
    </section>
  `;
}

function leaderboardBlock(title = "Running leaderboard") {
  const rows = state.leaderboard.length
    ? state.leaderboard.slice(0, 8).map((p) => `
      <li class="row">
        <span class="rank">${p.rank}</span>
        <strong>${escapeHtml(p.name)}</strong>
        <span class="score">${p.score}</span>
      </li>
    `).join("")
    : `<li class="muted">No scores yet.</li>`;

  return `
    <section class="card stack">
      <h2>${title}</h2>
      <ul class="list">${rows}</ul>
    </section>
  `;
}

function renderHost() {
  const participantCount = state.participants.length;
  const nextAction = hostAction();

  app.innerHTML = `
    ${header()}
    <div class="app-grid">
      <div class="stack">
        ${hostMain()}
      </div>
      <aside class="stack">
        <section class="card stack">
          <h3>Join</h3>
          <p class="muted">Share this link with participants on the same network.</p>
          <div class="join-link">${hostLink()}</div>
          <p class="muted">Participants: ${participantCount}</p>
        </section>
        ${leaderboardBlock()}
        <section class="card stack">
          <h3>Host controls</h3>
          ${nextAction}
          <button class="danger" data-host-action="reset">Reset quiz</button>
          <p id="host-action-error" class="form-message error">${escapeHtml(hostAuthMessage)}</p>
        </section>
      </aside>
    </div>
  `;

  bindHostActions();
}

function hostMain() {
  if (state.phase === "lobby") {
    return `
      <section class="card stack">
        <h2>Get everyone in</h2>
        <p class="lede">Ask everyone to open the participant link, enter a name, and wait here before you start.</p>
        ${participantList()}
      </section>
    `;
  }

  if (state.phase === "countdown") {
    return countdownBlock();
  }

  if (state.phase === "answering") {
    return `${questionBlock(true)}<section class="card">${timerBlock("Answer time")}</section>${responseProgress()}`;
  }

  if (state.phase === "awaitingReveal") {
    return `${questionBlock(true)}${responseProgress()}<section class="card callout"><strong>Answer window closed.</strong><p class="muted">Pause here, then reveal the correct answer when you are ready.</p></section>`;
  }

  if (state.phase === "reveal") {
    return `${questionBlock(true)}${answerSummary()}`;
  }

  if (state.phase === "leaderboard") {
    return leaderboardBlock("Leaderboard after this question");
  }

  return leaderboardBlock("Final results");
}

function hostAction() {
  const disabledStart = state.participants.length === 0 ? "disabled" : "";
  const isFinalQuestion = state.currentQuestionIndex >= state.totalQuestions - 1;
  const actions = {
    lobby: `<button class="primary" data-host-action="start" ${disabledStart}>Start quiz</button>`,
    countdown: `<p class="muted">The next question is about to appear.</p>`,
    answering: `<p class="muted">Answer timer is running.</p>`,
    awaitingReveal: `<button class="primary" data-host-action="reveal">Reveal answer</button>`,
    reveal: `<button class="primary" data-host-action="leaderboard">${isFinalQuestion ? "Reveal final results" : "Show leaderboard"}</button>`,
    leaderboard: `<button class="primary" data-host-action="next">Next question</button>`,
    finished: `<button class="primary" data-host-action="reset">Start over</button>`
  };
  return actions[state.phase] || "";
}

function participantList() {
  const rows = state.participants.length
    ? state.participants.map((p) => `<li class="row"><span class="rank">·</span><strong>${escapeHtml(p.name)}</strong><span>${p.score}</span></li>`).join("")
    : `<li class="muted">No participants yet.</li>`;
  return `<ul class="list">${rows}</ul>`;
}

function responseProgress() {
  const answered = state.participants.filter((p) => p.answered).length;
  return `
    <section class="card">
      <h3>Responses</h3>
      <p class="lede">${answered} of ${state.participants.length} answered</p>
    </section>
  `;
}

function answerSummary() {
  const s = state.lastQuestionSummary;
  if (!s) return "";
  return `
    <section class="card">
      <h3>This was the right answer</h3>
      <p class="lede">${escapeHtml(s.correctAnswer)}</p>
      <div class="summary-grid">
        <div class="stat"><strong>${s.correct}</strong><span>Correct</span></div>
        <div class="stat"><strong>${s.missed}</strong><span>Missed</span></div>
        <div class="stat"><strong>${s.total}</strong><span>Players</span></div>
      </div>
    </section>
  `;
}

function bindHostActions() {
  document.querySelectorAll("[data-host-action]").forEach((button) => {
    button.addEventListener("click", () => postHostAction(button.dataset.hostAction));
  });
}

function renderParticipant() {
  const me = currentParticipant();
  if (!me) {
    renderJoin();
    return;
  }

  app.innerHTML = `
    ${header()}
    <div class="stack">
      ${participantMain(me)}
    </div>
  `;

  document.querySelectorAll("[data-answer]").forEach((button) => {
    button.addEventListener("click", async () => {
      const optionIndex = Number(button.dataset.answer);
      sessionStorage.setItem(`answer-${state.currentQuestionIndex}`, String(optionIndex));
      await post("answer", { id: participantId(), optionIndex });
    });
  });
}

function renderJoin() {
  app.innerHTML = `
    <main class="landing">
      <section class="panel stack">
        <div class="join-status">${connectionStatusBlock()}</div>
        <p class="eyebrow">World Cup 2026</p>
        <h1>Join the quiz</h1>
        <p class="lede">Enter your name before the host starts.</p>
        <form id="join-form" class="stack">
          <div class="field">
            <label for="name">Display name</label>
            <input id="name" name="name" maxlength="28" autocomplete="name" required>
          </div>
          <button class="primary" type="submit">Join quiz</button>
          <p id="join-error" class="muted"></p>
        </form>
      </section>
    </main>
  `;

  document.querySelector("#join-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const result = await post("join", { name: new FormData(event.currentTarget).get("name") });
    if (result.ok) {
      localStorage.setItem(participantKey, result.id);
      render();
    } else {
      document.querySelector("#join-error").textContent = result.message;
    }
  });
}

function participantMain(me) {
  if (state.phase === "lobby") {
    return `
      <section class="card stack">
        <p class="eyebrow">You are in as ${escapeHtml(me.name)}</p>
        <h2>Waiting for the host</h2>
        <p class="lede">Keep this page open. The first question will appear here.</p>
      </section>
    `;
  }

  if (state.phase === "countdown") {
    return countdownBlock();
  }

  if (state.phase === "answering") {
    if (participantAnswer()) {
      return `${questionBlock(true, false)}<section class="card callout"><strong>Answer locked.</strong><p class="muted">Nice. Waiting for the timer to finish.</p></section>`;
    }
    return `${questionBlock(true, true)}<section class="card">${timerBlock("Answer time")}</section>`;
  }

  if (state.phase === "awaitingReveal") {
    return `<section class="card stack"><h2>Time is up</h2><p class="lede">Waiting for the host to reveal the answer.</p></section>`;
  }

  if (state.phase === "reveal") {
    return `${questionBlock(true, false)}${answerSummary()}`;
  }

  if (state.phase === "leaderboard") {
    return leaderboardBlock("Running leaderboard");
  }

  return leaderboardBlock("Final results");
}

function render() {
  if (!state) return;
  lastRenderSignature = renderSignature();
  if (view === "host") renderHost();
  if (view === "participant") renderParticipant();
}

function renderTimerOnly() {
  if (!state?.phaseEndsAt) return;
  const signature = renderSignature();
  if (signature !== lastRenderSignature) {
    render();
    return;
  }

  const left = secondsLeft();
  document.querySelectorAll("[data-timer-number]").forEach((element) => {
    element.textContent = left;
  });
  document.querySelectorAll("[data-timer-bar]").forEach((element) => {
    element.style.setProperty("--progress", `${progressPercent()}%`);
  });
}

function renderSignature() {
  const participant = currentParticipant();
  const answered = participant?.answered || false;
  return [
    view,
    state.phase,
    state.currentQuestionIndex,
    state.participants.length,
    participant?.id || "guest",
    answered,
    state.leaderboard.map((p) => `${p.id}:${p.score}`).join("|")
  ].join(";");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

startApp();
