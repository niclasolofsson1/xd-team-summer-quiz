const app = document.querySelector("#app");
const view = document.body.dataset.view;
const participantKey = "xd-summer-quiz-participant-id";
const hostPinKey = "xd-summer-quiz-host-pin";
const answerKeyPrefix = "xd-summer-quiz-answer-";

let state = null;
let tick = null;
let timerAnimationFrame = null;
let lastRenderSignature = "";
let connectionStatus = "reconnecting";
let lastEventAt = 0;
let hostAuthMessage = "";
let hostGateMessage = "";
let hostFinalPreviewRequestId = 0;
let participantPreJoinStep = "welcome";
let selectedAvatarId = "us-eagle";
let lastParticipantScreenKey = "";
let serverClockOffsetMs = 0;
const preloadedParticipantAssets = new Set();

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
const avatars = [
  { id: "us-eagle", file: "us-eagle.webp", label: "Eagle" },
  { id: "us-hotdog", file: "us-hotdog.webp", label: "Hot dog" },
  { id: "us-statue", file: "us-statue.webp", label: "Statue" },
  { id: "ca-beaver", file: "ca-beaver.webp", label: "Beaver" },
  { id: "ca-leaf", file: "ca-leaf.webp", label: "Maple leaf" },
  { id: "ca-moose", file: "ca-moose.webp", label: "Moose" },
  { id: "mx-cactus", file: "mx-cactus.webp", label: "Cactus" },
  { id: "mx-chili", file: "mx-chili.webp", label: "Chili" },
  { id: "mx-taco", file: "mx-taco.webp", label: "Taco" }
];

const welcomeStagePreloadAssets = [
  "/assets/player-setup-screen/enter-lobby-button.png",
  ...avatars.map((avatar) => `/assets/avatars/${avatar.file}`)
];

const participantQuizBackground = "/assets/count-down-screen/count-down-bg.webp";
const displayQuizBackground = "/assets/display-screen/display-bg.webp";
const displayQrCode = "/assets/qr/qr-code.svg";
const deployedJoinUrl = "https://xd-team-summer-quiz.onrender.com/";

const setupStagePreloadAssets = [
  participantQuizBackground
];

const lobbyStagePreloadAssets = [];

async function post(action, payload = {}) {
  const res = await fetch(`/api/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function postHostAction(action, payload = {}) {
  const result = await post(action, { ...payload, hostPin: hostPin() });
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
    syncServerClock(state.serverNow);
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
  startTimerAnimationLoop();
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

function syncServerClock(serverNow) {
  if (!Number.isFinite(serverNow)) return;
  serverClockOffsetMs = serverNow - Date.now();
}

function quizNow() {
  return Date.now() + serverClockOffsetMs;
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
  const left = Math.max(0, Math.ceil((state.phaseEndsAt - quizNow()) / 1000));
  if (state.phase === "countdown") {
    return Math.min(left, Math.ceil((state.countdownMs || 0) / 1000));
  }
  return left;
}

function progressPercent() {
  if (!state?.phaseEndsAt || !state?.phaseStartedAt) return 0;
  const total = state.phaseEndsAt - state.phaseStartedAt;
  const left = Math.max(0, state.phaseEndsAt - quizNow());
  return Math.max(0, Math.min(100, (left / total) * 100));
}

function progressScale() {
  return progressPercent() / 100;
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

function answerStorageKey(questionIndex = state?.currentQuestionIndex) {
  return `${answerKeyPrefix}${participantId() || "anonymous"}-${questionIndex}`;
}

function clearStoredAnswers() {
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith(answerKeyPrefix) || key?.startsWith("answer-")) {
      sessionStorage.removeItem(key);
    }
  }
}

function participantScreenEnterClass(screenKey) {
  const shouldAnimate = screenKey !== lastParticipantScreenKey;
  lastParticipantScreenKey = screenKey;
  return shouldAnimate ? " participant-screen-enter" : "";
}

function hostLink() {
  return `${location.origin}/participant.html`;
}

function displayLink() {
  return `${location.origin}/display.html`;
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
        <span data-timer-bar style="--progress: ${progressPercent()}%; --progress-scale: ${progressScale()}"></span>
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
          <span data-timer-bar style="--progress: ${progressPercent()}%; --progress-scale: ${progressScale()}"></span>
        </div>
      </div>
    </section>
  `;
}

function questionBlock(includeOptions = true, interactive = false) {
  const q = state.question;
  if (!q) return "";
  const selected = sessionStorage.getItem(answerStorageKey());
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
    ? state.leaderboard.map((p) => `
      <li class="row">
        <span class="rank">${p.rank}</span>
        <strong>${escapeHtml(p.name)}</strong>
        <span class="score">${p.score}</span>
      </li>
    `).join("")
    : `<li class="muted">Scores will appear here once the quiz starts.</li>`;

  return `
    <section class="card stack host-leaderboard-card">
      <div class="host-card-heading">
        <div>
          <p class="host-section-kicker">Scores</p>
          <h2>${title}</h2>
        </div>
        <span class="host-card-count">${state.leaderboard.length} players</span>
      </div>
      <ul class="list">${rows}</ul>
    </section>
  `;
}

function joinBlock(participantCount = state.participants.length) {
  return `
    <section class="card stack host-join-card">
      <div class="host-card-heading">
        <div>
          <h3>Join the Quiz</h3>
          <p class="muted">Share this link with participants</p>
        </div>
        <div class="host-join-count"><strong>${participantCount}</strong><span>joined</span></div>
      </div>
      <div class="host-join-content">
        <div class="host-link-group">
          <span>Link</span>
          <div class="join-link">${hostLink()}</div>
          <small>The audience display has the join QR code.</small>
        </div>
      </div>
      <div class="host-display-link-group">
        <span>Audience display</span>
        <a class="host-display-link" href="/display.html" target="_blank" rel="noopener">Open display screen</a>
        <small>${displayLink()}</small>
      </div>
    </section>
  `;
}

function hostHeader(nextAction = hostAction()) {
  return `
    <section class="host-control-bar">
      <div class="host-control-main">
        <div class="host-control-title">
          <div>
            <h1>XD Team Summer Quiz</h1>
            <p>Host control panel</p>
          </div>
        </div>
        <div class="host-status-pills">
          <span class="host-phase-pill">${phaseLabels[state.phase]}</span>
          <span class="host-question-set-pill">${escapeHtml(state.questionSetName || "Test questions")}</span>
          ${connectionStatusBlock()}
        </div>
      </div>
      <div class="host-control-actions">
        <div class="host-primary-action">${nextAction}</div>
        <button class="host-reset-button" data-host-action="reset" type="button">Reset</button>
      </div>
      <p id="host-action-error" class="form-message error">${escapeHtml(hostAuthMessage)}</p>
    </section>
  `;
}

function renderHost() {
  const participantCount = state.participants.length;
  const nextAction = hostAction();
  const hostMainMarkup = hostMain();

  app.innerHTML = `
    ${hostHeader(nextAction)}
    <main class="host-layout">
      ${hostMainMarkup ? `<div class="stack host-main-area">${hostMainMarkup}</div>` : ""}
      <div class="stack host-join-area">
        ${joinBlock(participantCount)}
      </div>
      <div class="stack host-participants-area">
        <section class="card stack host-scroll-card">
          <h3>Participants</h3>
          ${participantList()}
        </section>
      </div>
      <div class="stack host-leaderboard-area">
        <section class="host-scroll-card">
          ${leaderboardBlock()}
        </section>
      </div>
    </main>
  `;

  bindHostActions();
  hydrateHostFinalPreview();
}

function hostMain() {
  if (state.phase === "lobby") {
    return questionSetCard();
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

  return hostFinalRevealPanel();
}

function questionSetCard() {
  const sets = state.questionSets || [];
  if (!sets.length) return "";

  return `
    <section class="card stack host-question-set-card">
      <div class="host-card-heading">
        <div>
          <p class="host-section-kicker">Setup</p>
          <h2>Question set</h2>
        </div>
        <span class="host-card-count">${state.totalQuestions} questions</span>
      </div>
      <div class="host-question-set-toggle" role="group" aria-label="Choose question set">
        ${sets.map((set) => {
          const selected = set.id === state.questionSetId;
          return `
            <button
              class="host-question-set-option ${selected ? "selected" : ""}"
              type="button"
              data-question-set-id="${set.id}"
              aria-pressed="${selected}"
            >
              <strong>${escapeHtml(set.name)}</strong>
              <span>${set.count} questions</span>
            </button>
          `;
        }).join("")}
      </div>
      <p class="muted">Choose before starting the quiz. Participants do not see answers or future questions.</p>
    </section>
  `;
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
    finished: `<p class="muted">Use the Final Reveal panel below.</p>`
  };
  return actions[state.phase] || "";
}

function finalRevealStage() {
  return Math.max(0, Math.min(3, Number(state?.finalRevealStage || 0)));
}

function hostFinalRevealPanel() {
  const stage = finalRevealStage();
  const copyByStage = {
    0: {
      title: "Final Reveal",
      label: "Next step",
      body: "Show positions 4 and below while the podium stays locked.",
      button: "Start Final Reveal"
    },
    1: {
      title: "Final Reveal",
      label: "Next reveal: 3rd Place",
      body: "Preview is visible only here. Players will see the 3rd place slot unlock next.",
      button: "Reveal 3rd Place",
      preview: "third"
    },
    2: {
      title: "Final Reveal",
      label: "Final reveal: Champion & Runner-up",
      body: "Reveal 1st and 2nd together so the runner-up does not spoil the champion.",
      button: "Reveal Champion",
      preview: "champion"
    },
    3: {
      title: "Final Reveal",
      label: "Reveal complete",
      body: "The full podium is now visible to everyone.",
      button: null
    }
  };
  const config = copyByStage[stage] || copyByStage[3];

  return `
    <section class="card stack host-final-reveal-card">
      <div class="host-card-heading">
        <div>
          <p class="host-section-kicker">${config.label}</p>
          <h2>${config.title}</h2>
        </div>
        <span class="host-card-count">Stage ${stage} of 3</span>
      </div>
      <p class="muted">${config.body}</p>
      ${config.preview ? `
        <div class="host-final-preview" data-host-final-preview="${config.preview}">
          <p class="muted">Loading host preview...</p>
        </div>
      ` : ""}
      ${config.button ? `<button class="primary host-final-reveal-button" data-host-action="final-reveal" type="button">${config.button}</button>` : `
        <div class="host-final-complete">
          <strong>Final reveal complete</strong>
          <span>Use Reset when you are ready to start a new quiz.</span>
        </div>
      `}
    </section>
  `;
}

function hydrateHostFinalPreview() {
  const target = document.querySelector("[data-host-final-preview]");
  if (!target || view !== "host" || state?.phase !== "finished") return;
  const requestId = ++hostFinalPreviewRequestId;
  post("final-preview", { hostPin: hostPin() }).then((result) => {
    if (requestId !== hostFinalPreviewRequestId) return;
    const currentTarget = document.querySelector("[data-host-final-preview]");
    if (!currentTarget || !result.ok) {
      if (currentTarget) currentTarget.innerHTML = `<p class="form-message error">${escapeHtml(result.message || "Host preview unavailable.")}</p>`;
      return;
    }
    currentTarget.innerHTML = hostFinalPreviewMarkup(currentTarget.dataset.hostFinalPreview, result.leaderboard || []);
  }).catch(() => {
    const currentTarget = document.querySelector("[data-host-final-preview]");
    if (currentTarget) currentTarget.innerHTML = `<p class="form-message error">Host preview unavailable.</p>`;
  });
}

function hostFinalPreviewMarkup(type, leaderboard) {
  if (type === "third") {
    return `<div class="host-final-preview-grid single">${hostFinalPreviewPlayer(leaderboard[2], "3rd Place")}</div>`;
  }

  return `
    <div class="host-final-preview-grid">
      ${hostFinalPreviewPlayer(leaderboard[0], "Champion")}
      ${hostFinalPreviewPlayer(leaderboard[1], "Runner-up")}
    </div>
  `;
}

function hostFinalPreviewPlayer(player, label) {
  if (!player) {
    return `
      <div class="host-final-preview-player">
        <span>${label}</span>
        <strong>No player</strong>
        <small>-</small>
      </div>
    `;
  }
  const avatar = avatarById(player.avatarId);
  return `
    <div class="host-final-preview-player">
      <span>${label}</span>
      <img src="/assets/avatars/${avatar.file}" alt="" aria-hidden="true">
      <strong>${escapeHtml(player.name)}</strong>
      <small>${player.score} points</small>
    </div>
  `;
}

function participantList() {
  const rows = state.participants.length
    ? state.participants.map((p) => {
        const score = Number.isFinite(Number(p.score)) ? p.score : "Locked";
        return `<li class="row"><span class="host-row-dot ${p.answered ? "answered" : ""}"></span><strong>${escapeHtml(p.name)}</strong><span>${p.answered ? "Answered" : score}</span></li>`;
      }).join("")
    : `<li class="muted">No participants yet. Share the join link to get people in.</li>`;
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
    button.addEventListener("click", () => {
      if (button.dataset.hostAction === "reset" && !window.confirm("Reset the quiz? This will clear the current live quiz state.")) {
        return;
      }
      postHostAction(button.dataset.hostAction);
    });
  });

  document.querySelectorAll("[data-question-set-id]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.questionSetId === state.questionSetId) return;
      postHostAction("set-question-set", { questionSetId: button.dataset.questionSetId });
    });
  });
}

function renderDisplay() {
  updateScreenBodyClass("display");

  if (state.phase === "lobby") {
    renderDisplayLobby();
    return;
  }

  if (state.phase === "countdown") {
    renderDisplayCountdown();
    return;
  }

  if (state.phase === "answering") {
    renderDisplayQuestion();
    return;
  }

  if (state.phase === "awaitingReveal") {
    renderDisplayTimeUp();
    return;
  }

  if (state.phase === "reveal") {
    renderDisplayReveal();
    return;
  }

  if (state.phase === "leaderboard") {
    renderDisplayLeaderboard();
    return;
  }

  if (state.phase === "finished") {
    renderDisplayFinalReveal();
  }
}

function displayScreen(className, content) {
  app.innerHTML = `
    <main class="display-screen ${className}" aria-live="polite">
      <img class="display-bg-img" src="${displayQuizBackground}" alt="" aria-hidden="true">
      ${content}
    </main>
  `;
}

function renderDisplayLobby() {
  const joinUrl = deployedJoinUrl;
  displayScreen("display-lobby-screen", `
    <section class="display-stage display-lobby-stage" aria-labelledby="display-lobby-title">
      <div class="display-lobby-copy">
        <p>Join on your phone</p>
        <h1 id="display-lobby-title">XD Summer Gathering Quiz</h1>
        <strong>${state.participants.length} players joined</strong>
      </div>
      <div class="display-lobby-layout">
        <div class="display-lobby-qr-column">
          <div class="pixel-frame display-qr-card" aria-label="QR code for participant page">
            <img class="display-qr" src="${displayQrCode}" alt="QR code for ${escapeHtml(joinUrl)}">
            <span>${escapeHtml(joinUrl)}</span>
          </div>
        </div>
        <section class="pixel-frame display-player-panel" aria-label="Joined players">
          <div class="display-player-panel-heading">
            <span>Players</span>
          </div>
          <div class="display-player-grid">
            ${displayParticipantGrid()}
          </div>
        </section>
      </div>
    </section>
  `);
}

function displayParticipantGrid() {
  if (!state.participants.length) {
    return `<p class="display-empty">Waiting for players<br>to join...</p>`;
  }

  return state.participants.map((participant) => {
    const avatar = avatarById(participant.avatarId);
    return `
      <div class="pixel-frame display-player-chip">
        <img src="/assets/avatars/${avatar.file}" alt="" aria-hidden="true">
        <strong>${escapeHtml(participant.name)}</strong>
      </div>
    `;
  }).join("");
}

function renderDisplayCountdown() {
  displayScreen("display-countdown-screen", `
    <section class="display-stage display-status-stage" aria-labelledby="display-countdown-title">
      <section class="pixel-frame countdown-card display-countdown-card" aria-label="Get ready">
        <p class="countdown-question-label">Question ${state.currentQuestionIndex + 1} of ${state.totalQuestions}</p>
        <h1 id="display-countdown-title">Get ready</h1>
        <div class="countdown-number" data-timer-number>${secondsLeft()}</div>
      </section>
    </section>
  `);
}

function renderDisplayQuestion() {
  displayScreen("display-question-screen", `
    <section class="display-stage display-question-stage" aria-labelledby="display-question-title">
      ${displayQuestionPanel({ mode: "answering" })}
      ${displayTimerPanel("Answer time")}
    </section>
  `);
}

function renderDisplayTimeUp() {
  displayScreen("display-time-up-screen", `
    <section class="display-stage display-question-stage" aria-labelledby="display-time-up-title">
      ${displayQuestionPanel({ mode: "waiting" })}
      <section class="pixel-frame display-status-strip">
        <h2 id="display-time-up-title">Time's up</h2>
        <p>Waiting for host to reveal the answer</p>
      </section>
    </section>
  `);
}

function renderDisplayReveal() {
  displayScreen("display-reveal-screen", `
    <section class="display-stage display-question-stage" aria-labelledby="display-question-title">
      ${displayQuestionPanel({ mode: "reveal" })}
    </section>
  `);
}

function displayQuestionPanel({ mode }) {
  const q = state.question;
  if (!q) return "";
  return `
    <section class="pixel-frame display-question-card">
      <p class="display-question-label">Question ${state.currentQuestionIndex + 1} / ${state.totalQuestions}</p>
      <h1 id="display-question-title">${escapeHtml(q.text)}</h1>
      ${displayAnswerOptions(mode)}
    </section>
  `;
}

function displayAnswerOptions(mode) {
  const q = state.question;
  const optionCounts = state.lastQuestionSummary?.optionCounts || [];
  return `
    <div class="display-answer-grid">
      ${q.options.map((option, index) => {
        const isCorrect = mode === "reveal" && q.correctIndex === index;
        const isDimmed = mode === "reveal" && q.correctIndex !== index;
        const count = optionCounts[index] || 0;
        return `
          <div class="display-answer-option question-answer question-answer-${optionNames[index].toLowerCase()} ${isCorrect ? "correct" : ""} ${isDimmed ? "dimmed" : ""}">
            <span class="question-answer-text"><strong>${optionNames[index]}.</strong> ${escapeHtml(option)}</span>
            ${mode === "reveal" ? `<span class="question-answer-count" aria-label="${count} players chose this answer">${count}</span>` : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function displayTimerPanel(label) {
  const left = secondsLeft();
  return `
    <section class="pixel-frame display-timer-card" aria-label="${label}">
      <div>
        <span>${label}</span>
      </div>
      <div class="question-timer-frame display-timer-bar">
        <span data-timer-bar style="--progress: ${progressPercent()}%; --progress-scale: ${progressScale()}"></span>
      </div>
    </section>
  `;
}

function renderDisplayLeaderboard() {
  displayScreen("display-leaderboard-screen", `
    <section class="display-stage display-leaderboard-stage" aria-labelledby="display-leaderboard-title">
      <header class="display-section-header">
        <p>Current standings</p>
        <h1 id="display-leaderboard-title">Leaderboard</h1>
      </header>
      <ol class="pixel-frame display-leaderboard-list">
        ${displayLeaderboardRows()}
      </ol>
    </section>
  `);
}

function displayLeaderboardRows() {
  if (!state.leaderboard.length) {
    return `<li class="display-empty">Scores will appear here soon.</li>`;
  }

  return state.leaderboard.map((participant) => {
    const avatar = avatarById(participant.avatarId);
    return `
      <li class="display-leaderboard-row">
        <span>${ordinalRank(participant.rank)}</span>
        <img src="/assets/avatars/${avatar.file}" alt="" aria-hidden="true">
        <strong>${escapeHtml(participant.name)}</strong>
        <small>${participant.score} pts</small>
      </li>
    `;
  }).join("");
}

function renderDisplayFinalReveal() {
  const stage = finalRevealStage();

  if (stage <= 0) {
    displayScreen("display-final-screen", `
      <section class="display-stage display-final-stage" aria-labelledby="display-final-title">
        <header class="participant-final-header display-final-header">
          <p>FINAL RESULTS</p>
          <h1 id="display-final-title">The roadtrip is complete</h1>
        </header>
        <section class="pixel-frame participant-final-waiting-card display-final-waiting-card">
          <strong>Final reveal locked</strong>
          <span>Waiting for the host to start the final results.</span>
        </section>
      </section>
    `);
    return;
  }

  displayScreen("display-final-screen", `
    <section class="display-stage display-final-stage" aria-labelledby="display-final-title">
      <header class="participant-final-header display-final-header">
        <p>FINAL RESULTS</p>
        <h1 id="display-final-title">The roadtrip is complete</h1>
      </header>
      ${stage === 3 ? pixelConfettiBurst() : ""}
      <section class="participant-podium display-podium" aria-label="Top three">
        ${participantPodiumSlot(2, "Runner-up", "second", stage >= 3, stage === 3)}
        ${participantPodiumSlot(1, "Champion", "first", stage >= 3, stage === 3)}
        ${participantPodiumSlot(3, "3rd Place", "third", stage >= 2, stage === 2)}
      </section>
      <section class="pixel-frame participant-final-standings display-final-standings" aria-label="Final standings">
        <div class="participant-final-standings-heading">
          <span>Final standings</span>
          <strong>points</strong>
        </div>
        <ol class="participant-final-standings-list">
          ${participantFinalStandingsRows()}
        </ol>
      </section>
    </section>
  `);
}

function updateScreenBodyClass(screen) {
  const isWelcome = screen === "welcome";
  const isPlayerSetup = screen === "setup" || screen === "player-setup";
  const isWaiting = screen === "waiting";
  const isCountdown = screen === "countdown";
  const isQuestion = screen === "question";
  const isDisplay = screen === "display";
  const themeColor = "#f2f2f2";
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  [document.documentElement, document.body].forEach((element) => {
    element.classList.remove("welcome-active", "player-setup-active", "waiting-active", "countdown-active", "question-active", "display-active");
    if (isWelcome) {
      element.classList.add("welcome-active");
    }
    if (isPlayerSetup) {
      element.classList.add("player-setup-active");
    }
    if (isWaiting) {
      element.classList.add("waiting-active");
    }
    if (isCountdown) {
      element.classList.add("countdown-active");
    }
    if (isQuestion) {
      element.classList.add("question-active");
    }
    if (isDisplay) {
      element.classList.add("display-active");
    }
  });

  app.classList.remove("welcome-shell", "player-setup-shell", "waiting-shell", "countdown-shell", "question-shell", "display-shell");
  if (isWelcome) {
    app.classList.add("welcome-shell");
  }
  if (isPlayerSetup) {
    app.classList.add("player-setup-shell");
  }
  if (isWaiting) {
    app.classList.add("waiting-shell");
  }
  if (isCountdown) {
    app.classList.add("countdown-shell");
  }
  if (isQuestion) {
    app.classList.add("question-shell");
  }
  if (isDisplay) {
    app.classList.add("display-shell");
  }

  if (themeMeta) {
    themeMeta.setAttribute("content", themeColor);
  }
}

function renderParticipant() {
  const me = currentParticipant();
  if (!me) {
    lastParticipantScreenKey = "";
    if (state?.phase === "lobby") clearStoredAnswers();
    renderPreJoin();
    return;
  }

  if (state.phase === "lobby") {
    clearStoredAnswers();
    renderParticipantWaiting(me);
    return;
  }

  if (state.phase === "countdown") {
    renderParticipantCountdown();
    return;
  }

  if (state.phase === "answering") {
    renderParticipantQuestion();
    return;
  }

  if (state.phase === "awaitingReveal") {
    renderParticipantTimeUp();
    return;
  }

  if (state.phase === "reveal") {
    renderParticipantReveal();
    return;
  }

  if (state.phase === "leaderboard") {
    renderParticipantLeaderboard();
    return;
  }

  if (state.phase === "finished") {
    renderParticipantFinalReveal();
    return;
  }

  updateScreenBodyClass(null);
  app.innerHTML = `
    ${header()}
    <div class="stack">
      ${participantMain(me)}
    </div>
  `;

  bindParticipantAnswerActions();
}

function bindParticipantAnswerActions() {
  document.querySelectorAll("[data-answer]").forEach((button) => {
    button.addEventListener("click", async () => {
      const optionIndex = Number(button.dataset.answer);
      sessionStorage.setItem(answerStorageKey(), String(optionIndex));
      document.querySelectorAll("[data-answer]").forEach((choice) => {
        choice.disabled = true;
        choice.classList.toggle("selected", choice.dataset.answer === String(optionIndex));
      });
      await post("answer", { id: participantId(), optionIndex });
    });
  });
}

function avatarById(avatarId) {
  return avatars.find((avatar) => avatar.id === avatarId) || avatars[0];
}

function ordinalRank(rank) {
  const value = Number(rank);
  if (!Number.isFinite(value)) return rank;
  const lastTwo = value % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${value}th`;
  const last = value % 10;
  if (last === 1) return `${value}st`;
  if (last === 2) return `${value}nd`;
  if (last === 3) return `${value}rd`;
  return `${value}th`;
}

function preloadParticipantAssets(assets) {
  assets.forEach((src) => {
    if (preloadedParticipantAssets.has(src)) return;
    preloadedParticipantAssets.add(src);
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  });
}

function queueParticipantPreload(assets) {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => preloadParticipantAssets(assets), { timeout: 1000 });
    return;
  }
  window.setTimeout(() => preloadParticipantAssets(assets), 0);
}

function renderPreJoin() {
  if (participantPreJoinStep === "setup") {
    renderPlayerSetup();
    return;
  }

  renderWelcome();
}

function renderWelcome() {
  updateScreenBodyClass("welcome");
  app.innerHTML = `
    <main class="welcome-screen" aria-labelledby="welcome-title">
      <h1 id="welcome-title" class="sr-only">XD Team Summer Quiz</h1>
      <img class="welcome-bg-img" src="/assets/start-screen/welcome-bg.webp" alt="" aria-hidden="true">
      <img class="welcome-cloud welcome-cloud-left" src="/assets/start-screen/pixel-cloud-left.png" alt="" aria-hidden="true">
      <img class="welcome-cloud welcome-cloud-right" src="/assets/start-screen/pixel-cloud-right.png" alt="" aria-hidden="true">
      <section class="welcome-content" aria-label="Welcome">
        <img class="welcome-logo" src="/assets/start-screen/summer-quiz-logo.webp" alt="Experience Design Team Summer Quiz. World Cup 2026 Road Trip Edition.">
        <button id="start-setup" class="welcome-start-button" type="button" aria-label="Press to start">
          <img src="/assets/start-screen/start-button.png" alt="" aria-hidden="true">
        </button>
      </section>
    </main>
  `;
  queueParticipantPreload(welcomeStagePreloadAssets);

  document.querySelector("#start-setup").addEventListener("click", () => {
    participantPreJoinStep = "setup";
    updateScreenBodyClass("player-setup");
    renderParticipant();
  });
}

function renderPlayerSetup() {
  updateScreenBodyClass("player-setup");
  if (!avatars.some((avatar) => avatar.id === selectedAvatarId)) {
    selectedAvatarId = avatars[0].id;
  }
  app.innerHTML = `
    <main class="player-setup-screen" aria-labelledby="player-setup-title">
      <img class="player-setup-bg-img" src="/assets/player-setup-screen/player-setup-bg.webp" alt="" aria-hidden="true">
      <section class="player-setup-content" aria-label="Player setup">
        <h1 id="player-setup-title">Choose your<br>Character</h1>
        <form id="join-form" class="player-setup-form">
          <div class="player-name-group">
            <label for="name">Player name</label>
            <div class="pixel-frame player-name-frame">
              <input id="name" name="name" maxlength="28" autocomplete="name" placeholder="Enter your name" required>
            </div>
          </div>
          <fieldset class="player-avatar-field">
            <legend>Avatar select</legend>
            <div class="pixel-frame player-avatar-frame">
              <div class="player-avatar-grid">
                ${avatars.map((avatar) => `
                <button
                  class="player-avatar-choice ${avatar.id === selectedAvatarId ? "selected" : ""}"
                  type="button"
                  data-avatar-id="${avatar.id}"
                  aria-pressed="${avatar.id === selectedAvatarId}"
                  aria-label="Select ${avatar.label} avatar"
                >
                  <img src="/assets/avatars/${avatar.file}" alt="" aria-hidden="true">
                </button>
              `).join("")}
              </div>
            </div>
          </fieldset>
          <button class="player-enter-lobby-button" type="submit" aria-label="Enter Lobby">
            <img src="/assets/player-setup-screen/enter-lobby-button.png" alt="" aria-hidden="true">
          </button>
          <p id="join-error" class="player-setup-error" aria-live="polite"></p>
        </form>
      </section>
    </main>
  `;
  queueParticipantPreload(setupStagePreloadAssets);

  document.querySelectorAll("[data-avatar-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedAvatarId = button.dataset.avatarId;
      document.querySelectorAll("[data-avatar-id]").forEach((choice) => {
        const isSelected = choice.dataset.avatarId === selectedAvatarId;
        choice.classList.toggle("selected", isSelected);
        choice.setAttribute("aria-pressed", String(isSelected));
      });
    });
  });

  document.querySelector("#join-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const result = await post("join", {
      name: new FormData(event.currentTarget).get("name"),
      avatarId: selectedAvatarId
    });
    if (result.ok) {
      clearStoredAnswers();
      localStorage.setItem(participantKey, result.id);
      updateScreenBodyClass(null);
      render();
    } else {
      document.querySelector("#join-error").textContent = result.message;
    }
  });
}

function renderParticipantCountdown() {
  updateScreenBodyClass("countdown");
  const enterClass = participantScreenEnterClass(`countdown-${state.currentQuestionIndex}`);
  app.innerHTML = `
    <main class="countdown-screen" aria-labelledby="countdown-title">
      <img class="countdown-bg-img" src="${participantQuizBackground}" alt="" aria-hidden="true">
      <section class="pixel-frame countdown-card${enterClass}" aria-label="Get ready">
        <p class="countdown-question-label">Question ${state.currentQuestionIndex + 1} of ${state.totalQuestions}</p>
        <h1 id="countdown-title">Get ready</h1>
        <div class="countdown-number" data-timer-number>${secondsLeft()}</div>
      </section>
    </main>
  `;
}

function renderParticipantTimeUp() {
  updateScreenBodyClass("countdown");
  const enterClass = participantScreenEnterClass(`time-up-${state.currentQuestionIndex}`);
  app.innerHTML = `
    <main class="countdown-screen" aria-labelledby="time-up-title">
      <img class="countdown-bg-img" src="${participantQuizBackground}" alt="" aria-hidden="true">
      <section class="pixel-frame countdown-card time-up-card${enterClass}" aria-label="Time is up">
        <h1 id="time-up-title">Time is up</h1>
        <p class="time-up-copy">Waiting for the host to reveal the answer.</p>
      </section>
    </main>
  `;
}

function renderParticipantQuestion() {
  const q = state.question;
  if (!q) return;
  const answered = participantAnswer();
  const selected = sessionStorage.getItem(answerStorageKey());
  updateScreenBodyClass("question");
  const enterClass = participantScreenEnterClass(`question-${state.currentQuestionIndex}`);
  app.innerHTML = `
    <main class="question-screen" aria-labelledby="participant-question-title">
      <img class="question-bg-img" src="${participantQuizBackground}" alt="" aria-hidden="true">
      <section class="question-content${enterClass}" aria-label="Question">
        <section class="pixel-frame question-card">
          <p class="question-label">Question ${state.currentQuestionIndex + 1} of ${state.totalQuestions}</p>
          <h1 id="participant-question-title">${escapeHtml(q.text)}</h1>
          <div class="question-answer-list">
            ${q.options.map((option, index) => {
              const isSelected = selected === String(index);
              return `
                <button
                  class="question-answer question-answer-${optionNames[index].toLowerCase()} ${isSelected ? "selected" : ""}"
                  type="button"
                  data-answer="${index}"
                  ${answered ? "disabled" : ""}
                >
                  <span class="question-answer-text"><strong>${optionNames[index]}.</strong> ${escapeHtml(option)}</span>
                </button>
              `;
            }).join("")}
          </div>
        </section>
        <section class="pixel-frame question-timer-card" aria-label="Answer time">
          <p>Answer time</p>
          <div class="question-timer-frame">
            <span data-timer-bar style="--progress: ${progressPercent()}%; --progress-scale: ${progressScale()}"></span>
          </div>
        </section>
      </section>
    </main>
  `;
  if (!answered) {
    bindParticipantAnswerActions();
  }
}

function renderParticipantReveal() {
  const q = state.question;
  if (!q) return;
  const me = currentParticipant();
  const answerResult = me?.currentAnswer || null;
  const storedAnswer = sessionStorage.getItem(answerStorageKey());
  const selectedIndex = Number.isInteger(answerResult?.optionIndex) ? answerResult.optionIndex : (storedAnswer === null ? null : Number(storedAnswer));
  const optionCounts = state.lastQuestionSummary?.optionCounts || q.options.map(() => 0);
  const resultCorrect = Boolean(answerResult?.correct);
  const resultPoints = Number(answerResult?.points || 0);
  updateScreenBodyClass("countdown");
  const enterClass = participantScreenEnterClass(`reveal-${state.currentQuestionIndex}`);
  app.innerHTML = `
    <main class="countdown-screen" aria-labelledby="participant-reveal-title">
      <img class="countdown-bg-img" src="${participantQuizBackground}" alt="" aria-hidden="true">
      <section class="question-content${enterClass}" aria-label="Answer reveal">
        <section class="pixel-frame question-card">
          <p class="question-label">Question ${state.currentQuestionIndex + 1} of ${state.totalQuestions}</p>
          <h1 id="participant-reveal-title">${escapeHtml(q.text)}</h1>
          <div class="question-answer-list">
            ${q.options.map((option, index) => {
              const isCorrect = q.correctIndex === index;
              const isSelected = selectedIndex === index;
              const answerStateClass = isCorrect ? "correct" : (isSelected ? "your-answer" : "reveal-dim");
              return `
                <button
                  class="question-answer question-answer-${optionNames[index].toLowerCase()} ${answerStateClass}"
                  type="button"
                  disabled
                  aria-current="${isCorrect ? "true" : "false"}"
                >
                  <span class="question-answer-text"><strong>${optionNames[index]}.</strong> ${escapeHtml(option)}</span>
                  <span class="question-answer-count" aria-label="${optionCounts[index] || 0} players chose this answer">${optionCounts[index] || 0}</span>
                </button>
              `;
            }).join("")}
          </div>
        </section>
        <section class="pixel-frame question-timer-card reveal-result-card" aria-label="Your result">
          <div class="reveal-result-frame ${resultCorrect ? "is-correct" : "is-incorrect"}">
            <span class="reveal-result-label">${resultCorrect ? "Correct!" : "Incorrect"}</span>
            <strong>${resultCorrect ? `+${resultPoints}` : "0"} points</strong>
          </div>
        </section>
      </section>
    </main>
  `;
}

function renderParticipantFinalReveal() {
  updateScreenBodyClass("countdown");
  const stage = finalRevealStage();
  const enterClass = participantScreenEnterClass("final-reveal");

  if (stage <= 0) {
    app.innerHTML = `
      <main class="leaderboard-screen final-results-screen" aria-labelledby="participant-final-title">
        <img class="countdown-bg-img" src="${participantQuizBackground}" alt="" aria-hidden="true">
        <section class="participant-final-content waiting-final${enterClass}" aria-label="Final reveal">
          <header class="participant-final-header">
            <p>FINAL RESULTS</p>
            <h1 id="participant-final-title">The roadtrip is complete</h1>
          </header>
          <section class="pixel-frame participant-final-waiting-card">
            <strong>Final reveal locked</strong>
            <span>Waiting for the host to start the final results.</span>
          </section>
        </section>
      </main>
    `;
    return;
  }

  app.innerHTML = `
    <main class="leaderboard-screen final-results-screen" aria-labelledby="participant-final-title">
      <img class="countdown-bg-img" src="${participantQuizBackground}" alt="" aria-hidden="true">
      <section class="participant-final-content${enterClass}" aria-label="Final results">
        <header class="participant-final-header">
          <p>FINAL RESULTS</p>
          <h1 id="participant-final-title">The roadtrip is complete</h1>
        </header>
        ${stage === 3 ? pixelConfettiBurst() : ""}
        <section class="participant-podium" aria-label="Top three">
          ${participantPodiumSlot(2, "Runner-up", "second", stage >= 3, stage === 3)}
          ${participantPodiumSlot(1, "Champion", "first", stage >= 3, stage === 3)}
          ${participantPodiumSlot(3, "3rd Place", "third", stage >= 2, stage === 2)}
        </section>
        <section class="pixel-frame participant-final-standings" aria-label="Final standings">
          <div class="participant-final-standings-heading">
            <span>Final standings</span>
            <strong>points</strong>
          </div>
          <ol class="participant-final-standings-list">
            ${participantFinalStandingsRows()}
          </ol>
        </section>
      </section>
    </main>
  `;
}

function pixelConfettiBurst() {
  const basePieces = [
    ["-4%", "10%", "-38px", "146px", "#f2bd35", "0ms", "square"],
    ["7%", "22%", "-34px", "130px", "#f2bd35", "210ms", "wide"],
    ["14%", "5%", "24px", "158px", "#f51acc", "420ms", "tall"],
    ["18%", "16%", "-18px", "116px", "#f51acc", "70ms", "diamond"],
    ["25%", "28%", "24px", "126px", "#f2bd35", "260ms", "square"],
    ["32%", "8%", "-42px", "152px", "#f51acc", "510ms", "wide"],
    ["38%", "14%", "-42px", "138px", "#f51acc", "95ms", "square"],
    ["45%", "25%", "18px", "142px", "#f2bd35", "330ms", "tall"],
    ["48%", "20%", "16px", "118px", "#f2bd35", "45ms", "diamond"],
    ["56%", "6%", "-30px", "160px", "#f51acc", "610ms", "square"],
    ["58%", "13%", "-22px", "132px", "#f2bd35", "120ms", "wide"],
    ["66%", "30%", "28px", "120px", "#f51acc", "390ms", "tall"],
    ["70%", "22%", "32px", "122px", "#f51acc", "30ms", "square"],
    ["78%", "9%", "-24px", "150px", "#f2bd35", "550ms", "diamond"],
    ["82%", "17%", "-28px", "134px", "#f2bd35", "85ms", "wide"],
    ["91%", "27%", "18px", "112px", "#f51acc", "10ms", "square"],
    ["102%", "13%", "36px", "148px", "#f2bd35", "460ms", "tall"],
    ["4%", "46%", "30px", "126px", "#f51acc", "670ms", "diamond"],
    ["12%", "43%", "30px", "106px", "#f2bd35", "130ms", "square"],
    ["21%", "54%", "-22px", "118px", "#f51acc", "720ms", "wide"],
    ["24%", "38%", "-26px", "118px", "#f51acc", "60ms", "square"],
    ["35%", "45%", "22px", "102px", "#f2bd35", "150ms", "tall"],
    ["44%", "56%", "-30px", "112px", "#f2bd35", "580ms", "diamond"],
    ["50%", "39%", "-34px", "116px", "#f51acc", "40ms", "wide"],
    ["61%", "58%", "18px", "104px", "#f51acc", "760ms", "square"],
    ["64%", "44%", "26px", "108px", "#f2bd35", "110ms", "square"],
    ["76%", "37%", "-18px", "122px", "#f51acc", "75ms", "tall"],
    ["84%", "53%", "26px", "110px", "#f2bd35", "690ms", "wide"],
    ["88%", "46%", "34px", "106px", "#f2bd35", "140ms", "diamond"],
    ["98%", "40%", "-32px", "124px", "#f51acc", "300ms", "square"]
  ];
  const pieces = [
    ...basePieces,
    ...basePieces.map(([left, top, drift, fall, color, delay, shape], index) => [
      `${(Number.parseFloat(left) + 3 + (index % 5) * 2).toFixed(1)}%`,
      `${(Number.parseFloat(top) + 5 + (index % 4) * 3).toFixed(1)}%`,
      `${Math.round(Number.parseFloat(drift) * -0.72)}px`,
      `${Math.round(Number.parseFloat(fall) * 1.08)}px`,
      color,
      `${Number.parseInt(delay, 10) + 95}ms`,
      shape
    ])
  ];

  return `
    <div class="pixel-confetti" aria-hidden="true">
      ${pieces.map(([left, top, drift, fall, color, delay, shape]) => `
        <span class="shape-${shape}" style="--x: ${left}; --y: ${top}; --drift: ${drift}; --fall: ${fall}; --confetti-color: ${color}; --delay: ${delay};"></span>
      `).join("")}
    </div>
  `;
}

function participantPodiumSlot(rank, label, placement, revealed, isNewReveal = false) {
  const player = state.leaderboard.find((entry) => entry.rank === rank);
  if (!revealed) {
    return `
      <article class="pixel-frame participant-podium-slot ${placement} locked">
        <span class="participant-podium-rank">${ordinalRank(rank)}</span>
        <div class="participant-podium-avatar placeholder">???</div>
        <strong>LOCKED</strong>
        <small>???</small>
      </article>
    `;
  }
  if (!player) {
    return `
      <article class="pixel-frame participant-podium-slot ${placement} locked">
        <span class="participant-podium-rank">${ordinalRank(rank)}</span>
        <div class="participant-podium-avatar placeholder">-</div>
        <strong>NO PLAYER</strong>
        <small>-</small>
      </article>
    `;
  }
  const avatar = avatarById(player.avatarId);
  const nameSize = podiumNameFontSize(player.name, placement);
  const trophy = placement === "first"
    ? `<img class="participant-podium-trophy" src="/assets/leaderboard/trophy.png" alt="" aria-hidden="true">`
    : "";
  return `
    <article class="pixel-frame participant-podium-slot ${placement} revealed ${isNewReveal ? "is-new-reveal" : ""}">
      <span class="participant-podium-rank">${label}</span>
      <span class="participant-podium-avatar-wrap">
        <img class="participant-podium-avatar" src="/assets/avatars/${avatar.file}" alt="" aria-hidden="true">
        ${trophy}
      </span>
      <strong style="--podium-name-size: ${nameSize}px">${escapeHtml(player.name)}</strong>
      <small>${player.score} pts</small>
    </article>
  `;
}

function podiumNameFontSize(name, placement) {
  const length = Array.from(String(name || "")).length;
  const isChampion = placement === "first";
  if (length <= 8) return isChampion ? 16 : 15;
  if (length <= 11) return isChampion ? 14 : 13;
  if (length <= 14) return isChampion ? 12 : 10;
  if (length <= 18) return isChampion ? 10 : 9;
  return isChampion ? 9 : 8;
}

function participantFinalStandingsRows() {
  const rows = state.leaderboard.filter((participant) => participant.rank >= 4);
  if (!rows.length) {
    return `<li class="participant-final-empty">No players below the podium.</li>`;
  }

  return rows.map((participant) => {
    const avatar = avatarById(participant.avatarId);
    return `
      <li class="participant-final-row">
        <span class="participant-leaderboard-rank">${ordinalRank(participant.rank)}</span>
        <img class="participant-leaderboard-avatar" src="/assets/avatars/${avatar.file}" alt="" aria-hidden="true">
        <strong>${escapeHtml(participant.name)}</strong>
        <span class="participant-leaderboard-score">${participant.score}</span>
      </li>
    `;
  }).join("");
}

function renderParticipantLeaderboard() {
  updateScreenBodyClass("countdown");
  const enterClass = participantScreenEnterClass(`leaderboard-${state.phase}-${state.currentQuestionIndex}`);
  const currentId = participantId();
  const currentParticipant = state.leaderboard.find((participant) => participant.id === currentId);
  const yourScore = currentParticipant ? currentParticipant.score : 0;
  const yourRank = currentParticipant ? ordinalRank(currentParticipant.rank) : "-";
  const rows = state.leaderboard.length
    ? state.leaderboard.map((participant) => {
        const avatar = avatarById(participant.avatarId);
        const isCurrentParticipant = participant.id === currentId;
        return `
          <li class="pixel-frame participant-leaderboard-row ${isCurrentParticipant ? "is-current-player" : ""}">
            <span class="participant-leaderboard-rank">${ordinalRank(participant.rank)}</span>
            <img class="participant-leaderboard-avatar" src="/assets/avatars/${avatar.file}" alt="" aria-hidden="true">
            <strong>${escapeHtml(participant.name)}</strong>
            <span class="participant-leaderboard-score">${participant.score} pts</span>
          </li>
        `;
      }).join("")
    : `<li class="pixel-frame participant-leaderboard-row participant-leaderboard-empty">No scores yet.</li>`;

  app.innerHTML = `
    <main class="leaderboard-screen" aria-labelledby="participant-leaderboard-title">
      <img class="countdown-bg-img" src="${participantQuizBackground}" alt="" aria-hidden="true">
      <section class="participant-leaderboard-content${enterClass}" aria-label="Leaderboard">
        <section class="pixel-frame participant-score-card" aria-label="Your score">
          <span>Your score</span>
          <strong>${yourScore}</strong>
          <small>${yourRank}</small>
        </section>
        <header class="participant-leaderboard-header">
          <h1 id="participant-leaderboard-title">High scores</h1>
        </header>
        <ol class="participant-leaderboard-list">
          ${rows}
        </ol>
      </section>
    </main>
  `;
}

function participantMain(me) {
  if (state.phase === "lobby") {
    return waitingForHostScreen(me);
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

function renderParticipantWaiting(me) {
  updateScreenBodyClass("waiting");
  app.innerHTML = waitingForHostScreen(me, participantScreenEnterClass("waiting"));
  queueParticipantPreload(lobbyStagePreloadAssets);
}

function waitingForHostScreen(me, enterClass = "") {
  const avatar = avatarById(me.avatarId);
  return `
    <main class="waiting-screen" aria-labelledby="waiting-title">
      <img class="waiting-bg-img" src="${participantQuizBackground}" alt="" aria-hidden="true">
      <section class="pixel-frame waiting-card${enterClass}" aria-label="Waiting for host">
        <p class="waiting-player-line">You are in as <span>${escapeHtml(me.name)}</span></p>
        <img class="waiting-avatar" src="/assets/avatars/${avatar.file}" alt="" aria-hidden="true">
        <h1 id="waiting-title">Waiting for host</h1>
        <p class="waiting-copy">Keep this page open.<br>The quiz will start soon.</p>
      </section>
    </main>
  `;
}

function render() {
  if (!state) return;
  lastRenderSignature = renderSignature();
  if (view === "host") renderHost();
  if (view === "participant") renderParticipant();
  if (view === "display") renderDisplay();
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
  updateTimerBars();
}

function startTimerAnimationLoop() {
  if (timerAnimationFrame) return;

  const tickTimer = () => {
    updateTimerBars();
    timerAnimationFrame = requestAnimationFrame(tickTimer);
  };

  timerAnimationFrame = requestAnimationFrame(tickTimer);
}

function updateTimerBars() {
  document.querySelectorAll("[data-timer-bar]").forEach((element) => {
    const progress = progressPercent();
    element.style.setProperty("--progress", `${progress}%`);
    element.style.setProperty("--progress-scale", String(progress / 100));
  });
}

function renderSignature() {
  const participant = currentParticipant();
  const answered = participant?.answered || false;
  return [
    view,
    state.phase,
    state.currentQuestionIndex,
    state.finalRevealStage,
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
