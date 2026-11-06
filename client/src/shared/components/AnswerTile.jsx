import { CheckmarkFilled, Close } from "@carbon/icons-react";
import { OPTION_LETTERS, pickedLabel } from "../format.js";

// One answer: letter + colour + text. Colour is never the only cue; the letter and, once chosen or
// revealed, a written mark ("Your answer", "Correct answer") carry the meaning too.
//
// mine: this player's pick (solid Carbon blue stroke). correct: the right answer, after the reveal.
// dim: an answer that recedes (light tint, dark text); on the reveal a dimmed pick of yours was wrong.
export function AnswerTile({ index, text, mine, correct, dim, disabled, onChoose, count }) {
  const letter = OPTION_LETTERS[index];
  const className = [
    "answer-tile",
    `answer-tile--${letter.toLowerCase()}`,
    mine && "answer-tile--mine",
    correct && "answer-tile--correct",
    dim && "answer-tile--dim"
  ]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      <span className="answer-tile__letter" aria-hidden="true">{letter}</span>
      {/* Text, marks and count are one group, centred next to the letter. */}
      <span className="answer-tile__body">
        <span className="answer-tile__text">
          <span className="visually-hidden">{letter}: </span>
          {text}
        </span>
        {correct && (
          <span className="answer-tile__mark">
            <CheckmarkFilled size={20} aria-hidden="true" /> Correct answer
          </span>
        )}
        {mine && (
          <span className="answer-tile__mark">
            {dim && <Close size={20} aria-hidden="true" />} Your answer
          </span>
        )}
        {count !== undefined && <span className="answer-tile__count">{pickedLabel(count)}</span>}
      </span>
    </>
  );

  if (!onChoose) return <div className={className}>{content}</div>;
  return (
    <button type="button" className={className} disabled={disabled} aria-pressed={Boolean(mine)} onClick={() => onChoose(index)}>
      {content}
    </button>
  );
}
