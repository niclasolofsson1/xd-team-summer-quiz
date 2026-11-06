import { Podium } from "../../shared/components/Podium.jsx";
import { Leaderboard } from "../../shared/components/Leaderboard.jsx";
import { finalLayout } from "../../shared/podium.js";
import { pointsLabel, rankLabel } from "../../shared/format.js";

export function Final({ state, me }) {
  const stage = state.finalRevealStage;
  const { places, standings } = finalLayout(state.leaderboard, state.participants.length, stage);
  const mine = state.leaderboard.find((entry) => entry.id === me.id);

  if (stage <= 0) {
    return (
      <section className="screen screen--center final">
        <h1 className="screen__title">Final results</h1>
        <p className="screen__lead">Waiting for the host to start the final results.</p>
      </section>
    );
  }

  return (
    <section className="screen final">
      <h1 className="screen__title">Final results</h1>
      {mine && (
        <p className="final__mine">
          You finished {rankLabel(mine.rank, mine.tied)} · {pointsLabel(mine.score)}
        </p>
      )}
      <Podium places={places} meId={me.id} />
      {standings.length > 0 && <Leaderboard entries={standings} meId={me.id} limit={standings.length} label="Final standings" />}
    </section>
  );
}
