import { AnswerTile } from "../../shared/components/AnswerTile.jsx";

function resultFor(result) {
  if (!result || result.noAnswer) return { kind: "none", text: "No answer" };
  if (result.correct) return { kind: "correct", text: `Correct! +${result.points}` };
  return { kind: "wrong", text: "Not this time" };
}

export function Reveal({ state, me, myAnswer }) {
  const result = me.currentAnswer;
  const banner = resultFor(result);
  const correctIndex = state.question.correctIndex;
  const mine = result?.optionIndex ?? (result?.noAnswer ? null : myAnswer);
  const counts = state.lastQuestionSummary?.optionCounts || [];

  function markFor(index) {
    if (index === correctIndex) return "correct";
    if (index === mine) return "wrong";
    return "dim";
  }

  return (
    <section className="screen reveal">
      <p className={`result-banner result-banner--${banner.kind}`}>{banner.text}</p>
      <h1 className="question__text question__text--small">{state.question.text}</h1>
      <div className="answer-grid">
        {state.question.options.map((text, index) => (
          <AnswerTile key={index} index={index} text={text} mark={markFor(index)} count={counts[index] ?? 0} />
        ))}
      </div>
    </section>
  );
}
