// Plain logic for the big screen (no React), unit-tested in tests/unit/display.test.js.

// The lobby wall shows up to this many chips (4 columns × 7 rows fit at every 16:9 size, since the
// screen's type scales with it). With more players, the last chip says "+N more".
export const WALL_MAX = 28;

// Final standings rows that fit next to the podium; the rest become "and N more players".
export const STANDINGS_MAX = 9;

export function playersLabel(n) {
  return n === 1 ? "1 player" : `${n} players`;
}

// "14 of 22 answered" while a question is open; counts only players in the quiz.
export function answeredLabel(participants = []) {
  const answered = participants.filter((p) => p.answered).length;
  return `${answered} of ${participants.length} answered`;
}

// Which phases show the answered count in the top bar.
const ANSWER_PHASES = new Set(["answering", "awaitingReveal", "reveal"]);
const QUESTION_PHASES = new Set(["countdown", "answering", "awaitingReveal", "reveal", "leaderboard"]);

// What the top bar shows on the right, as plain parts: { question: "Question 3 of 25" | null, count }.
export function topBarMeta(state) {
  if (!state) return { question: null, count: "" };
  const participants = state.participants || [];
  const question = QUESTION_PHASES.has(state.phase)
    ? `Question ${state.currentQuestionIndex + 1} of ${state.totalQuestions}`
    : null;
  const count = ANSWER_PHASES.has(state.phase) ? answeredLabel(participants) : playersLabel(participants.length);
  return { question, count };
}

// The line under the reveal: "12 of 20 got it right" · "2 players didn't answer."
export function revealSummary(summary) {
  if (!summary) return { title: "", text: "" };
  const answered = summary.total - summary.missed;
  const title = answered === 0 ? "No one answered" : `${summary.correct} of ${answered} got it right`;
  const text =
    summary.missed === 0 || answered === 0 ? "" : summary.missed === 1 ? "1 player didn't answer." : `${summary.missed} players didn't answer.`;
  return { title, text };
}

// The lobby wall: everyone when they fit, else the first WALL_MAX - 1 and a "+N more" count.
export function wallEntries(participants = [], max = WALL_MAX) {
  if (participants.length <= max) return { shown: participants, more: 0 };
  return { shown: participants.slice(0, max - 1), more: participants.length - (max - 1) };
}

// Final standings next to the podium: as many as fit, then how many are left.
export function standingsThatFit(standings = [], max = STANDINGS_MAX) {
  if (standings.length <= max) return { shown: standings, more: 0 };
  return { shown: standings.slice(0, max), more: standings.length - max };
}

export function morePlayersLabel(n) {
  return n === 1 ? "and 1 more player" : `and ${n} more players`;
}

// Sub-heading on the final screen, per reveal stage.
export const FINAL_STAGE_TEXT = [
  "The host will reveal the final results.",
  "4th place and down.",
  "3rd place.",
  "Champion and runner-up."
];

export function finalStageText(stage) {
  return FINAL_STAGE_TEXT[Math.min(Math.max(Number(stage) || 0, 0), 3)];
}

// The join address as people type it: no "http://" or "https://", no trailing slash.
export function displayUrl(url) {
  return String(url || "").replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

// True when phones must be on the same network to join: the join address is a private LAN address
// (192.168/16, 10/8, 172.16/12) or localhost. A public address (Render) works from anywhere.
export function isLocalNetworkUrl(url) {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  if (host === "localhost" || host === "127.0.0.1") return true;
  const p = host.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n))) return false;
  return p[0] === 192 && p[1] === 168 || p[0] === 10 || (p[0] === 172 && p[1] >= 16 && p[1] <= 31);
}

// The line under the join address. The Wi-Fi part only when the address is on the local network.
export function joinHint(url) {
  return isLocalNetworkUrl(url) ? "Scan the code or type the address. Same Wi-Fi as the host." : "Scan the code or type the address.";
}
