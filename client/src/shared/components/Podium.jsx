import { Avatar } from "./Avatar.jsx";
import { PODIUM_ORDER, medalFor } from "../podium.js";

// Three places laid out 2-1-3. `places` comes from finalLayout(). Revealed places get their medal;
// the medal is decorative, the place label ("Champion") says the same in words.
export function Podium({ places, meId }) {
  return (
    <div className="podium">
      {PODIUM_ORDER.map((index) => {
        const place = places[index];
        const isMe = place.entry?.id === meId;
        return (
          <div
            key={index}
            className={`podium__place podium__place--${index + 1} podium__place--${place.state}${isMe ? " podium__place--me" : ""}`}
          >
            <div className="podium__who">
              {place.state === "revealed" && (
                <>
                  <span className="podium__medal" aria-hidden="true">{medalFor(place.entry.rank)}</span>
                  <Avatar id={place.entry.avatarId} size="lg" />
                  <span className="podium__name">
                    {place.entry.name}
                    {isMe && <span className="visually-hidden"> (you)</span>}
                  </span>
                  <span className="podium__score">{place.entry.score} points</span>
                </>
              )}
              {place.state === "locked" && (
                <span className="podium__locked">
                  <span aria-hidden="true">?</span>
                  <span className="visually-hidden">Not revealed yet</span>
                </span>
              )}
              {place.state === "empty" && <span className="podium__empty">No player</span>}
            </div>
            <div className="podium__step">{place.label}</div>
          </div>
        );
      })}
    </div>
  );
}
