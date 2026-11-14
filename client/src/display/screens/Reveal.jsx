import { AnswerTile } from "../../shared/components/AnswerTile.jsx";
import { isLongQuestion } from "../../shared/format.js";
import { revealSummary } from "../displayView.js";

// The v1.3.3 one-row reveal tile: the correct answer in full colour, the others recede (dark tile with
// a strip of their colour on the big screen), picks per answer on the right.
export function Reveal({ state }) {
  const correctIndex = state.question.correctIndex;
  const summary = state.lastQuestionSummary;
  const counts = summary?.optionCounts || [];
  const line = revealSummary(summary);
  return (
    <div className="ds-q ds-q--reveal">
      <h1 className={isLongQuestion(state.question.text) ? "ds-q__text ds-q__text--long" : "ds-q__text"}>{state.question.text}</h1>
      <div className="answer-grid">
        {state.question.options.map((text, index) => (
          <AnswerTile
            key={index}
            index={index}
            text={text}
            correct={index === correctIndex}
            dim={index !== correctIndex}
            count={counts[index] ?? 0}
            reveal
          />
        ))}
      </div>
      <div className="ds-status">
        <p className="ds-status__title">{line.title}</p>
        {line.text && <p className="ds-status__text">{line.text}</p>}
      </div>
    </div>
  );
}
