import { InlineNotification, Select, SelectItem } from "@carbon/react";

export const ANSWER_TIMES = [5, 10, 15, 20, 30];
export const TEST_SET_WARNING = "You're about to run the test questions.";

// Lobby only: which questions to play and how long players get. Carbon Select (native, so it also works
// well on a phone); Carbon keeps the content switcher for switching views, not for settings.
// Changes go to the server at once; the fields follow the server's state, so a second host tab stays in step.
export function SetupFields({ state, busy, onSetQuestionSet, onSetAnswerTime }) {
  const sets = state.questionSets || [];
  const seconds = Math.round(state.answerMs / 1000);
  const times = ANSWER_TIMES.includes(seconds) ? ANSWER_TIMES : [...ANSWER_TIMES, seconds].sort((a, b) => a - b);

  return (
    <>
      <Select
        id="question-set"
        labelText="Question set"
        value={state.questionSetId}
        disabled={busy}
        onChange={(event) => event.target.value !== state.questionSetId && onSetQuestionSet(event.target.value)}
      >
        {sets.map((set) => (
          <SelectItem key={set.id} value={set.id} text={`${set.name} (${set.count} questions)`} />
        ))}
      </Select>
      {state.questionSetId === "test" && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={TEST_SET_WARNING}
          className="control-panel__warning"
        />
      )}
      <Select
        id="answer-time"
        labelText="Answer time"
        value={String(seconds)}
        disabled={busy}
        onChange={(event) => Number(event.target.value) !== seconds && onSetAnswerTime(Number(event.target.value))}
      >
        {times.map((value) => (
          <SelectItem key={value} value={String(value)} text={`${value} seconds`} />
        ))}
      </Select>
    </>
  );
}
