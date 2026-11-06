import { Leaderboard as LeaderboardList } from "../../shared/components/Leaderboard.jsx";
import { rankLabel } from "../../shared/format.js";

export function Leaderboard({ state, me }) {
  const mine = state.leaderboard.find((entry) => entry.id === me.id);
  return (
    <section className="screen leaderboard-screen">
      <h1 className="screen__title">Leaderboard</h1>
      {mine && (
        <div className="score-card">
          <div>
            <span className="score-card__label">Your rank</span>
            <span className="score-card__value">{rankLabel(mine.rank, mine.tied)}</span>
          </div>
          <div>
            <span className="score-card__label">Your score</span>
            <span className="score-card__value">{mine.score}</span>
          </div>
        </div>
      )}
      <LeaderboardList entries={state.leaderboard} meId={me.id} />
    </section>
  );
}
