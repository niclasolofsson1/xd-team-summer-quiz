import { Button, InlineNotification, Tag } from "@carbon/react";
import { AnswerTile } from "../shared/components/AnswerTile.jsx";
import { TimerBar } from "../shared/components/TimerBar.jsx";
import { Leaderboard } from "../shared/components/Leaderboard.jsx";
import { secondsLeft } from "../shared/clock.js";
import { useNow } from "../shared/useNow.js";
import { FinalRevealPanel } from "./FinalRevealPanel.jsx";

// What's happening now, plus one large primary button for the next step.
export function StagePanel({ state, offsetMs, step, busy, error, onPrimary, preview }) {
  return (
    <section className="host-card stage-panel" aria-labelledby="stage-title">
      <p className="stage-panel__eyebrow">{step.eyebrow}</p>
      <h1 id="stage-title" className="stage-panel__title">
        {step.title}
      </h1>

      {state && <StageContent state={state} offsetMs={offsetMs} preview={preview} />}

      <div className="stage-panel__action">
        <Button
          kind="primary"
          size="xl"
          className="stage-panel__primary"
          disabled={!step.enabled || busy}
          onClick={onPrimary}
          aria-keyshortcuts="ArrowRight PageDown Space"
        >
          {busy ? "Sending…" : step.label}
        </Button>
        {step.hint && <p className="stage-panel__hint">{step.hint}</p>}
        {error && (
          <InlineNotification kind="error" lowContrast hideCloseButton title={error} className="stage-panel__error" />
        )}
      </div>
    </section>
  );
}

function StageContent({ state, offsetMs, preview }) {
  const answered = state.participants.filter((p) => p.answered).length;
  const total = state.participants.length;
  switch (state.phase) {
    case "countdown":
      return <Countdown endsAt={state.phaseEndsAt} offsetMs={offsetMs} />;
    case "answering":
    case "awaitingReveal":
      return (
        <>
          <QuestionBlock question={state.question} />
          {state.phase === "answering" && (
            <TimerBar
              key={`timer-${state.currentQuestionIndex}`}
              startedAt={state.phaseStartedAt}
              endsAt={state.phaseEndsAt}
              offsetMs={offsetMs}
            />
          )}
          <p className="stage-panel__count">
            {answered} of {total} answered
          </p>
        </>
      );
    case "reveal":
      return <RevealBlock state={state} />;
    case "leaderboard":
      return <Leaderboard entries={state.leaderboard} label="Leaderboard after this question" />;
    case "finished":
      return <FinalRevealPanel state={state} preview={preview} />;
    default:
      return null;
  }
}

function Countdown({ endsAt, offsetMs }) {
  const now = useNow(100);
  const seconds = secondsLeft(endsAt, offsetMs, now);
  return (
    <p className="stage-panel__countdown" aria-hidden="true">
      {Math.max(1, seconds)}
    </p>
  );
}

function QuestionBlock({ question, correctIndex, counts }) {
  if (!question) return null;
  const revealed = correctIndex !== undefined;
  return (
    <div className="stage-question">
      {question.label && (
        <Tag type="cool-gray" size="md" className="stage-question__category">
          {question.label}
        </Tag>
      )}
      <p className="stage-question__text">{question.text}</p>
      <div className="answer-grid answer-grid--host">
        {question.options.map((text, index) => (
          <AnswerTile
            key={index}
            index={index}
            text={text}
            correct={revealed && index === correctIndex}
            dim={revealed && index !== correctIndex}
            count={revealed ? counts?.[index] ?? 0 : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function RevealBlock({ state }) {
  const summary = state.lastQuestionSummary;
  const correctIndex = state.question?.correctIndex ?? summary?.correctIndex;
  return (
    <>
      <QuestionBlock question={state.question} correctIndex={correctIndex} counts={summary?.optionCounts} />
      {summary && (
        <dl className="reveal-stats">
          <div>
            <dt>Correct</dt>
            <dd>{summary.correct}</dd>
          </div>
          <div>
            <dt>Missed</dt>
            <dd>{summary.missed}</dd>
          </div>
          <div>
            <dt>Players</dt>
            <dd>{summary.total}</dd>
          </div>
        </dl>
      )}
    </>
  );
}
