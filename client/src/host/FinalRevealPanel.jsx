import { Podium } from "../shared/components/Podium.jsx";
import { finalLayout } from "../shared/podium.js";
import { previewStage } from "./hostSteps.js";

// The final reveal, host side. While the podium is still being unlocked, the host sees a private
// preview of the podium as it will look after the next click (from /api/final-preview, PIN only),
// so they can build up the moment. At the end, the podium as everyone sees it.
export function FinalRevealPanel({ state, preview }) {
  const stage = Number(state.finalRevealStage) || 0;
  const next = previewStage(stage);

  if (stage >= 3) {
    const { places } = finalLayout(state.leaderboard, state.participants.length, 3);
    return <Podium places={places} />;
  }

  if (next === null) {
    return <p className="final-panel__note">Players see "Final results". The first step shows 4th place and down.</p>;
  }

  return (
    <div className="final-panel__preview">
      <p className="final-panel__label">
        Preview of the next step · only on your screen
      </p>
      {preview ? (
        <Podium places={finalLayout(preview, preview.length, next).places} />
      ) : (
        <p className="final-panel__note">Loading the preview…</p>
      )}
    </div>
  );
}
