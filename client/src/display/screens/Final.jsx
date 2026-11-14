import { Podium } from "../../shared/components/Podium.jsx";
import { Leaderboard } from "../../shared/components/Leaderboard.jsx";
import { finalLayout } from "../../shared/podium.js";
import { Confetti } from "../Confetti.jsx";
import { finalStageText, morePlayersLabel, standingsThatFit } from "../displayView.js";

// Staged podium (stages 0–3; the server hides what isn't revealed). Standings from 4th down sit next to
// the podium from stage 1. Confetti once the champion is revealed.
export function Final({ state }) {
  const stage = state.finalRevealStage;
  const { places, standings } = finalLayout(state.leaderboard, state.participants.length, stage);
  const { shown, more } = standingsThatFit(standings);
  const champion = places[0].state === "revealed";
  return (
    <>
      <div className={shown.length ? "ds-final ds-final--split" : "ds-final"}>
        <section className="ds-final__stage">
          <div>
            <h1 className="ds-final__title">Final results</h1>
            <p className="ds-final__sub">{finalStageText(stage)}</p>
          </div>
          <Podium places={places} />
        </section>
        {shown.length > 0 && (
          <section className="ds-stand">
            <h2 className="ds-stand__title">Final standings</h2>
            <div>
              <Leaderboard entries={shown} limit={shown.length} label="Final standings" />
              {more > 0 && <p className="ds-stand__more">{morePlayersLabel(more)}</p>}
            </div>
          </section>
        )}
      </div>
      {champion && <Confetti />}
    </>
  );
}
