import { CheckmarkFilled } from "@carbon/icons-react";
import { Avatar } from "../shared/components/Avatar.jsx";
import { playersSummary } from "./hostSteps.js";

const QUESTION_PHASES = new Set(["countdown", "answering", "awaitingReveal"]);

// Every player: avatar, name, connected dot, answered check (during a question), score.
// In the final reveal, players the podium hasn't revealed yet stay "Locked player", as on every screen.
export function PlayersPanel({ state }) {
  const showAnswered = QUESTION_PHASES.has(state.phase);
  const players = state.participants;
  return (
    <section className="host-card players-panel" aria-labelledby="players-title">
      <div className="players-panel__head">
        <h2 id="players-title" className="host-card__title">
          Players
        </h2>
        <p className="players-panel__summary" aria-live="polite">
          {playersSummary(state)}
        </p>
      </div>
      {players.length === 0 ? (
        <p className="players-panel__empty">No players yet. Share the join link.</p>
      ) : (
        <ul className="players-panel__list">
          {players.map((player) => {
            const locked = player.avatarId === null;
            return (
              <li key={player.id} className={`player-row${locked ? " player-row--locked" : ""}`}>
                {locked ? (
                  <span className="player-row__locked" aria-hidden="true">?</span>
                ) : (
                  <Avatar id={player.avatarId} size="sm" />
                )}
                <span className="player-row__name">{player.name}</span>
                {!locked && (
                  <span className={`status-dot status-dot--${player.connected ? "connected" : "offline"}`}>
                    <span className="visually-hidden">{player.connected ? "Online" : "Offline"}</span>
                  </span>
                )}
                <span className="player-row__answered">
                  {showAnswered && player.answered && (
                    <>
                      <CheckmarkFilled size={16} aria-hidden="true" />
                      <span className="visually-hidden">Answered</span>
                    </>
                  )}
                </span>
                <span className="player-row__score">{locked ? "—" : player.score}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
