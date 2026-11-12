// What the host sees and can do next, from the public quiz state. Plain logic (unit-tested).
//
// Every phase has one primary step: a label, the host action it sends, and whether it can be pressed
// now. The server checks the phase again, so a step sent at the wrong moment does nothing.

const PHASE_LABELS = {
  lobby: "Lobby",
  countdown: "Get ready",
  answering: "Answering",
  awaitingReveal: "Time's up",
  reveal: "Answer revealed",
  leaderboard: "Leaderboard",
  finished: "Final reveal"
};

export function phaseLabel(phase) {
  return PHASE_LABELS[phase] || "Connecting";
}

export function questionLabel(state) {
  return `Question ${state.currentQuestionIndex + 1} of ${state.totalQuestions}`;
}

export function isLastQuestion(state) {
  return state.currentQuestionIndex >= state.totalQuestions - 1;
}

const FINAL_STEPS = [
  { label: "Start final reveal", hint: "Shows 4th place and down on the big screen." },
  { label: "Reveal 3rd place", hint: "Next: 3rd place." },
  { label: "Reveal champion", hint: "Next: the champion and the runner-up." }
];

// { eyebrow, title, label, action, enabled, hint }
export function hostStep(state) {
  if (!state) return { eyebrow: "", title: "Connecting…", label: "Start quiz", action: null, enabled: false, hint: "" };
  const players = state.participants.length;

  switch (state.phase) {
    case "lobby":
      return {
        eyebrow: phaseLabel("lobby"),
        title: players ? playersJoinedTitle(players) : "Set up the quiz",
        label: "Start quiz",
        action: "start",
        enabled: players > 0,
        hint: players
          ? `${state.questionSetName} · ${state.totalQuestions} questions · ${Math.round(state.answerMs / 1000)} s each`
          : "Start unlocks when the first player joins."
      };
    case "countdown":
      return {
        eyebrow: questionLabel(state),
        title: "Get ready",
        label: "Reveal answer",
        action: null,
        enabled: false,
        hint: "The question is about to appear."
      };
    case "answering":
      return {
        eyebrow: questionLabel(state),
        title: "Players are answering",
        label: "Reveal answer",
        action: null,
        enabled: false,
        hint: "Reveal unlocks when the time is up or everyone has answered."
      };
    case "awaitingReveal":
      return {
        eyebrow: questionLabel(state),
        title: "Time's up",
        label: "Reveal answer",
        action: "reveal",
        enabled: true,
        hint: "Answer window closed. Reveal when you're ready."
      };
    case "reveal": {
      const last = isLastQuestion(state);
      return {
        eyebrow: questionLabel(state),
        title: "Answer revealed",
        label: last ? "Reveal final results" : "Show leaderboard",
        action: "leaderboard",
        enabled: true,
        hint: last ? "That was the last question." : "Next: the leaderboard after this question."
      };
    }
    case "leaderboard":
      return {
        eyebrow: questionLabel(state),
        title: "Leaderboard",
        label: "Next question",
        action: "next",
        enabled: true,
        hint: `Up next: question ${state.currentQuestionIndex + 2} of ${state.totalQuestions}.`
      };
    case "finished": {
      const stage = Math.min(3, Math.max(0, Number(state.finalRevealStage) || 0));
      if (stage >= 3) {
        return {
          eyebrow: "Stage 3 of 3",
          title: "Final reveal complete",
          label: "Final reveal complete",
          action: null,
          enabled: false,
          hint: "Use Reset in the menu when you're ready to start a new quiz."
        };
      }
      return {
        eyebrow: `Stage ${stage} of 3`,
        title: "Final results",
        label: FINAL_STEPS[stage].label,
        action: "final-reveal",
        enabled: true,
        hint: FINAL_STEPS[stage].hint
      };
    }
    default:
      return { eyebrow: "", title: phaseLabel(state.phase), label: "Start quiz", action: null, enabled: false, hint: "" };
  }
}

function playersJoinedTitle(n) {
  return n === 1 ? "1 player joined" : `${n} players joined`;
}

const ANSWER_PHASES = new Set(["countdown", "answering", "awaitingReveal"]);

// "18 of 20 answered · 2 offline" during a question, "20 players · 2 offline" otherwise.
// Locked players in the final reveal are left out of the offline count (the server hides them).
export function playersSummary(state) {
  if (!state) return "";
  const visible = state.participants.filter((p) => p.avatarId !== null);
  const total = state.participants.length;
  const offline = visible.filter((p) => !p.connected).length;
  const main = ANSWER_PHASES.has(state.phase)
    ? `${state.participants.filter((p) => p.answered).length} of ${total} answered`
    : total === 1
      ? "1 player"
      : `${total} players`;
  return offline ? `${main} · ${offline} offline` : main;
}

// What the private preview shows next: the podium as it will look after the next click (stages 1 and 2).
export function previewStage(stage) {
  return stage === 1 || stage === 2 ? stage + 1 : null;
}
