// What the browser remembers. On a phone, the session (id + token) survives a refresh; the last name is kept
// even after a reset so rejoining is quick. Every access is guarded: private mode can throw.

const SESSION_KEY = "xd-quiz-player";
const NAME_KEY = "xd-quiz-last-name";
const ANSWER_PREFIX = "xd-quiz-answer-";

const local = () => globalThis.localStorage;
const session = () => globalThis.sessionStorage;

function read(store, key) {
  try {
    return store().getItem(key);
  } catch {
    return null;
  }
}

function write(store, key, value) {
  try {
    if (value === null) store().removeItem(key);
    else store().setItem(key, value);
  } catch {
    // Not stored; the app keeps working for this page load.
  }
}

export function loadSession() {
  try {
    const saved = JSON.parse(read(local, SESSION_KEY));
    return saved?.id && saved?.token ? saved : null;
  } catch {
    return null;
  }
}

export function saveSession(saved) {
  write(local, SESSION_KEY, saved ? JSON.stringify(saved) : null);
}

export function loadLastName() {
  return read(local, NAME_KEY) || "";
}

export function saveLastName(name) {
  write(local, NAME_KEY, name);
}

// The option the server confirmed for a question, so it stays marked after a refresh.
export function loadAnswer(playerId, questionIndex) {
  const value = read(session, `${ANSWER_PREFIX}${playerId}-${questionIndex}`);
  return value === null ? null : Number(value);
}

export function saveAnswer(playerId, questionIndex, optionIndex) {
  write(session, `${ANSWER_PREFIX}${playerId}-${questionIndex}`, String(optionIndex));
}

// The host PIN, for this browser tab's session only (the same key as the arcade host page).
const HOST_PIN_KEY = "xd-summer-quiz-host-pin";

export function loadHostPin() {
  return read(session, HOST_PIN_KEY);
}

export function saveHostPin(pin) {
  write(session, HOST_PIN_KEY, pin);
}
