import { ContentSwitcher, InlineNotification, Switch } from "@carbon/react";

export const ANSWER_TIMES = [5, 10, 15, 20, 30];
export const TEST_SET_WARNING = "You're about to run the test questions.";

// Lobby only: which questions to play and how long players get. Changes go to the server at once;
// the switchers follow the server's state, so a second host tab stays in step.
export function SetupPanel({ state, busy, onSetQuestionSet, onSetAnswerTime }) {
  const sets = state.questionSets || [];
  const setIndex = Math.max(0, sets.findIndex((set) => set.id === state.questionSetId));
  const seconds = Math.round(state.answerMs / 1000);
  const timeIndex = ANSWER_TIMES.indexOf(seconds);

  return (
    <section className="host-card setup-panel" aria-labelledby="setup-title">
      <h2 id="setup-title" className="host-card__title">
        Set up the quiz
      </h2>
      <div className="setup-panel__field">
        <p className="setup-panel__label" id="question-set-label">
          Question set
        </p>
        <ContentSwitcher
          aria-labelledby="question-set-label"
          selectedIndex={setIndex}
          onChange={({ name }) => name !== state.questionSetId && onSetQuestionSet(name)}
          size="lg"
        >
          {sets.map((set) => (
            <Switch key={set.id} name={set.id} text={`${set.name} (${set.count})`} disabled={busy} />
          ))}
        </ContentSwitcher>
      </div>
      {state.questionSetId === "test" && (
        <InlineNotification kind="warning" lowContrast hideCloseButton title={TEST_SET_WARNING} className="setup-panel__warning" />
      )}
      <div className="setup-panel__field">
        <p className="setup-panel__label" id="answer-time-label">
          Answer time
        </p>
        <ContentSwitcher
          aria-labelledby="answer-time-label"
          selectedIndex={timeIndex === -1 ? 0 : timeIndex}
          onChange={({ name }) => Number(name) !== seconds && onSetAnswerTime(Number(name))}
          size="lg"
        >
          {ANSWER_TIMES.map((value) => (
            <Switch key={value} name={String(value)} text={`${value} s`} disabled={busy} />
          ))}
        </ContentSwitcher>
        {timeIndex === -1 && <p className="setup-panel__note">Current answer time: {seconds} s</p>}
      </div>
    </section>
  );
}
