import { secondsLeft } from "../../shared/clock.js";
import { useNow } from "../../shared/useNow.js";

export function Countdown({ state, offsetMs }) {
  const now = useNow(100);
  const seconds = Math.max(1, secondsLeft(state.phaseEndsAt, offsetMs, now));
  return (
    <div className="ds-count">
      <p className="ds-count__q">
        Question {state.currentQuestionIndex + 1} of {state.totalQuestions}
      </p>
      <p className="ds-count__n" key={seconds} aria-hidden="true">
        {seconds}
      </p>
      <p className="ds-count__hint">Get ready</p>
    </div>
  );
}
