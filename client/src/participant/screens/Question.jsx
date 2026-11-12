import { useState } from "react";
import { InlineLoading, InlineNotification } from "@carbon/react";
import { CheckmarkFilled } from "@carbon/icons-react";
import { AnswerTile } from "../../shared/components/AnswerTile.jsx";
import { TimerBar } from "../../shared/components/TimerBar.jsx";
import { submitAnswer } from "../../shared/answer.js";
import { isLongQuestion, splitMessage } from "../../shared/format.js";

const SEND_FAILED = "Couldn't send your answer. Tap again.";

// Choosing → Sending… → Answer locked (after the server confirms) or "Couldn't send your answer. Tap again."
// While sending and once locked, every tile is disabled, so a second tap can't change what's shown.
export function Question({ state, offsetMs, me, session, myAnswer, onAnswered, onPlayerLost }) {
  const questionIndex = state.currentQuestionIndex;
  const [answer, setAnswer] = useState(() =>
    myAnswer !== null ? { status: "locked", optionIndex: myAnswer } : { status: "idle" }
  );

  // Confirmed by the server (for example from before a refresh) even if this phone lost the reply.
  const locked = answer.status === "locked" || (me.answered && answer.status !== "sending");
  const busy = answer.status === "sending" || locked || answer.status === "closed";

  async function choose(optionIndex) {
    if (busy) return;
    setAnswer({ status: "sending", optionIndex });
    const outcome = await submitAnswer(session.token, optionIndex);
    if (outcome.status === "locked") onAnswered(questionIndex, outcome.optionIndex);
    if (outcome.status === "lost") onPlayerLost(outcome.message);
    setAnswer(outcome.status === "failed" ? { status: "failed" } : outcome);
  }

  const shownOption = answer.status === "sending" || answer.status === "locked" ? answer.optionIndex : null;

  return (
    <section className="screen question">
      <p className="screen__eyebrow">
        Question {questionIndex + 1} of {state.totalQuestions}
      </p>
      <h1 className={isLongQuestion(state.question.text) ? "question__text question__text--long" : "question__text"}>
        {state.question.text}
      </h1>
      <TimerBar startedAt={state.phaseStartedAt} endsAt={state.phaseEndsAt} offsetMs={offsetMs} />
      <div className="answer-grid">
        {state.question.options.map((text, index) => (
          <AnswerTile
            key={index}
            index={index}
            text={text}
            mine={shownOption === index}
            dim={shownOption !== null && shownOption !== index}
            disabled={busy}
            onChoose={choose}
          />
        ))}
      </div>
      <div className="question__status" aria-live="polite">
        {answer.status === "sending" && <InlineLoading description="Sending…" />}
        {locked && (
          <p className="answer-locked">
            <CheckmarkFilled size={20} aria-hidden="true" /> Answer locked
          </p>
        )}
        {answer.status === "failed" && !locked && (
          <InlineNotification kind="error" lowContrast hideCloseButton {...splitMessage(SEND_FAILED)} />
        )}
        {answer.status === "closed" && (
          <InlineNotification kind="info" lowContrast hideCloseButton {...splitMessage(answer.message)} />
        )}
      </div>
    </section>
  );
}
