import { Tag } from "@carbon/react";
import { AnswerTile } from "../shared/components/AnswerTile.jsx";
import { TimerBar } from "../shared/components/TimerBar.jsx";
import { Leaderboard } from "../shared/components/Leaderboard.jsx";
import { secondsLeft } from "../shared/clock.js";
import { useNow } from "../shared/useNow.js";
import { FinalRevealPanel } from "./FinalRevealPanel.jsx";
import { questionLabel } from "./hostSteps.js";

// The main area during the game: what's on screen now. The question takes centre stage.
export function StageView({ state, offsetMs, preview }) {
  return (
    <section className="host-panel stage-view" aria-label="On screen now">
      <StageContent state={state} offsetMs={offsetMs} preview={preview} />
    </section>
  );
}

function StageContent({ state, offsetMs, preview }) {
  switch (state.phase) {
    case "countdown":
      return (
        <>
          <p className="stage-view__meta-label">{questionLabel(state)}</p>
          <Countdown endsAt={state.phaseEndsAt} offsetMs={offsetMs} />
        </>
      );
    case "answering":
    case "awaitingReveal":
      return (
        <>
          <QuestionBlock state={state} />
          {state.phase === "answering" && (
            <div className="stage-view__foot">
              <TimerBar
                key={`timer-${state.currentQuestionIndex}`}
                startedAt={state.phaseStartedAt}
                endsAt={state.phaseEndsAt}
                offsetMs={offsetMs}
              />
            </div>
          )}
        </>
      );
    case "reveal":
      return <RevealBlock state={state} />;
    case "leaderboard":
      return (
        <>
          <h2 className="stage-view__heading">Leaderboard after question {state.currentQuestionIndex + 1}</h2>
          <Leaderboard entries={state.leaderboard} label="Leaderboard after this question" />
        </>
      );
    case "finished":
      return (
        <>
          <h2 className="stage-view__heading">Final results</h2>
          <FinalRevealPanel state={state} preview={preview} />
        </>
      );
    default:
      return null;
  }
}

function Countdown({ endsAt, offsetMs }) {
  const now = useNow(100);
  const seconds = secondsLeft(endsAt, offsetMs, now);
  return (
    <p className="stage-view__countdown" aria-hidden="true">
      {Math.max(1, seconds)}
    </p>
  );
}

function QuestionBlock({ state, correctIndex, counts }) {
  const question = state.question;
  if (!question) return null;
  const revealed = correctIndex !== undefined;
  return (
    <>
      <div className="stage-view__meta">
        {question.label && (
          <Tag type="cool-gray" size="md" className="stage-view__category">
            {question.label}
          </Tag>
        )}
        <p className="stage-view__meta-label">{questionLabel(state)}</p>
      </div>
      <p className="stage-view__question">{question.text}</p>
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
    </>
  );
}

function RevealBlock({ state }) {
  const summary = state.lastQuestionSummary;
  const correctIndex = state.question?.correctIndex ?? summary?.correctIndex;
  return (
    <>
      <QuestionBlock state={state} correctIndex={correctIndex} counts={summary?.optionCounts} />
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
