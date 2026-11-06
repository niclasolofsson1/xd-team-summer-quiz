import { CheckmarkFilled, Close } from "@carbon/icons-react";
import { OPTION_LETTERS, pickedLabel } from "../format.js";

// One answer: letter + colour + text. Colour is never the only cue; the letter and, after the reveal,
// a text mark ("Correct answer", "Your answer") carry the meaning too.
//
// mark: "chosen" (this player's pick), "correct", "wrong" (this player's wrong pick), "dim", or none.
export function AnswerTile({ index, text, mark, disabled, onChoose, count }) {
  const letter = OPTION_LETTERS[index];
  const className = ["answer-tile", `answer-tile--${letter.toLowerCase()}`, mark && `answer-tile--${mark}`]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      <span className="answer-tile__letter" aria-hidden="true">{letter}</span>
      {/* Text, mark and count are one group, centred next to the letter. */}
      <span className="answer-tile__body">
        <span className="answer-tile__text">
          <span className="visually-hidden">{letter}: </span>
          {text}
        </span>
        {mark === "correct" && (
          <span className="answer-tile__mark">
            <CheckmarkFilled size={20} aria-hidden="true" /> Correct answer
          </span>
        )}
        {mark === "wrong" && (
          <span className="answer-tile__mark">
            <Close size={20} aria-hidden="true" /> Your answer
          </span>
        )}
        {mark === "chosen" && <span className="answer-tile__mark">Your answer</span>}
        {count !== undefined && <span className="answer-tile__count">{pickedLabel(count)}</span>}
      </span>
    </>
  );

  if (!onChoose) return <div className={className}>{content}</div>;
  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      aria-pressed={mark === "chosen"}
      onClick={() => onChoose(index)}
    >
      {content}
    </button>
  );
}
