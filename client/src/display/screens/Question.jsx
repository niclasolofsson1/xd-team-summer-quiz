import { AnswerTile } from "../../shared/components/AnswerTile.jsx";
import { TimerBar } from "../../shared/components/TimerBar.jsx";
import { isLongQuestion } from "../../shared/format.js";

// Answering and Time's up: the question, the four tiles, and the timer (or the Time's up line in its place).
export function Question({ state, offsetMs }) {
  const timeUp = state.phase === "awaitingReveal";
  return (
    <div className={timeUp ? "ds-q ds-q--timeup" : "ds-q"}>
      <h1 className={isLongQuestion(state.question.text) ? "ds-q__text ds-q__text--long" : "ds-q__text"}>{state.question.text}</h1>
      <div className="answer-grid">
        {state.question.options.map((text, index) => (
          <AnswerTile key={index} index={index} text={text} />
        ))}
      </div>
      {timeUp ? (
        <div className="ds-status">
          <p className="ds-status__title">Time's up!</p>
          <p className="ds-status__text">Waiting for the host to reveal the answer.</p>
        </div>
      ) : (
        <TimerBar startedAt={state.phaseStartedAt} endsAt={state.phaseEndsAt} offsetMs={offsetMs} />
      )}
    </div>
  );
}
