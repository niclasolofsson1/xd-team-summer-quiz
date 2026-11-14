import { Leaderboard as LeaderboardList } from "../../shared/components/Leaderboard.jsx";

export function Leaderboard({ state }) {
  return (
    <div className="ds-lb">
      <div className="ds-lb__head">
        <h1 className="ds-lb__title">Leaderboard</h1>
        <p className="ds-lb__sub">
          After question {state.currentQuestionIndex + 1} of {state.totalQuestions}
        </p>
      </div>
      <LeaderboardList entries={state.leaderboard} limit={10} />
    </div>
  );
}
