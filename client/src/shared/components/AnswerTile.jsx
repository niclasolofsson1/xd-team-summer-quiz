import { Tag } from "@carbon/react";
import { Checkmark, CheckmarkFilled, Close } from "@carbon/icons-react";
import { OPTION_LETTERS, pickedLabel } from "../format.js";

// One answer: letter + colour + text. Colour is never the only cue; the letter and, once chosen or
// revealed, a written mark ("Your answer", "Correct", "You") carry the meaning too.
//
// mine: this player's pick (solid Carbon blue stroke). correct: the right answer, after the reveal.
// dim: an answer that recedes (light tint, dark text); on the reveal a dimmed pick of yours was wrong.
// reveal (player reveal, v1.3.3): one row — letter | answer with tags ("✓ Correct", "You") | picks.
export function AnswerTile({ index, text, mine, correct, dim, disabled, onChoose, count, reveal }) {
  const letter = OPTION_LETTERS[index];
  const className = [
    "answer-tile",
    `answer-tile--${letter.toLowerCase()}`,
    reveal && "answer-tile--reveal",
    mine && "answer-tile--mine",
    correct && "answer-tile--correct",
    dim && "answer-tile--dim"
  ]
    .filter(Boolean)
    .join(" ");
  const label = (
    <span className="answer-tile__text">
      <span className="visually-hidden">{letter}: </span>
      {text}
    </span>
  );
  const content = reveal ? (
    <>
      <span className="answer-tile__letter" aria-hidden="true">{letter}</span>
      <span className="answer-tile__body">
        {label}
        {(correct || mine) && (
          <span className="answer-tile__tags">
            {correct && (
              <Tag type="green" renderIcon={Checkmark}>
                Correct
              </Tag>
            )}
            {mine && <Tag type="outline">You</Tag>}
          </span>
        )}
      </span>
      <span className="answer-tile__picks">
        <span className="answer-tile__picks-n">{count ?? 0}</span>
        <span className="answer-tile__picks-label">{count === 1 ? "pick" : "picks"}</span>
      </span>
    </>
  ) : (
    <>
      <span className="answer-tile__letter" aria-hidden="true">{letter}</span>
      {/* Text, marks and count are one group, centred next to the letter. */}
      <span className="answer-tile__body">
        {label}
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
