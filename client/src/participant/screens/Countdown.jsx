import { secondsLeft } from "../../shared/clock.js";
import { useNow } from "../../shared/useNow.js";

export function Countdown({ state, offsetMs }) {
  const now = useNow(100);
  const seconds = Math.max(1, secondsLeft(state.phaseEndsAt, offsetMs, now));
  return (
    <section className="screen screen--center countdown">
      <p className="screen__eyebrow">
        Question {state.currentQuestionIndex + 1} of {state.totalQuestions}
      </p>
      <p className="countdown__number" key={seconds} aria-hidden="true">
        {seconds}
      </p>
    </section>
  );
}
