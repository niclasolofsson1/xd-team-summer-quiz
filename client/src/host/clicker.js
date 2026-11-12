// Presentation clicker and keyboard support for the host: → / PageDown / Space press the primary
// button. Plain logic (unit-tested).
//
// - Debounced: one press per DEBOUNCE_MS, so a double-click on the clicker can't skip a step.
// - Never while typing in a field, inside a dialog or an open menu.
// - Space is left to the browser when focus is on another button or link (Space on "Copy" copies).
// - ← / PageUp and the clicker's "blank screen" key are ignored: there is no step back.

export const CLICKER_KEYS = new Set(["ArrowRight", "PageDown", " ", "Spacebar"]);
export const DEBOUNCE_MS = 1000;

const TYPING_SELECTOR = "input, textarea, select, [contenteditable=''], [contenteditable='true']";
const OVERLAY_SELECTOR = "[role='dialog'], [role='alertdialog'], [role='menu'], .cds--modal";
const CONTROL_SELECTOR = "button, a[href], [role='button'], [role='tab'], [role='radio'], summary";

const matches = (el, selector) => Boolean(el && typeof el.closest === "function" && el.closest(selector));

export function isClickerKey(event) {
  return CLICKER_KEYS.has(event.key) && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey;
}

export function shouldIgnore(event, { dialogOpen = false } = {}) {
  if (dialogOpen) return true;
  const target = event.target;
  if (target?.isContentEditable || matches(target, TYPING_SELECTOR)) return true;
  if (matches(target, OVERLAY_SELECTOR)) return true;
  const isSpace = event.key === " " || event.key === "Spacebar";
  return isSpace && matches(target, CONTROL_SELECTOR);
}

// handleKeyDown(event, { dialogOpen }) returns true when the key pressed the primary step.
export function createClicker({ onTrigger, debounceMs = DEBOUNCE_MS, now = () => Date.now() }) {
  let last = -Infinity;
  return function handleKeyDown(event, options = {}) {
    if (!isClickerKey(event) || shouldIgnore(event, options)) return false;
    // The key is ours from here on: no page scroll on Space / PageDown, even inside the debounce.
    event.preventDefault?.();
    if (event.repeat) return false;
    const time = now();
    if (time - last < debounceMs) return false;
    last = time;
    onTrigger();
    return true;
  };
}
