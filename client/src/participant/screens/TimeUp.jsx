import { AnswerTile } from "../../shared/components/AnswerTile.jsx";

export function TimeUp({ state, myAnswer }) {
  return (
    <section className="screen time-up">
      <h1 className="screen__title">Time's up!</h1>
      <p className="screen__lead">Waiting for the host to reveal the answer.</p>
      {myAnswer !== null && state.question && (
        <AnswerTile index={myAnswer} text={state.question.options[myAnswer]} mark="chosen" />
      )}
    </section>
  );
}
