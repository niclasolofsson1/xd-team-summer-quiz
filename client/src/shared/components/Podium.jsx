import { Avatar } from "./Avatar.jsx";
import { PODIUM_ORDER } from "../podium.js";

const CONFETTI_PIECES = 24;

// Three places laid out 2-1-3. `places` comes from finalLayout(); confetti plays when the champion is shown.
export function Podium({ places, meId, celebrate }) {
  return (
    <div className="podium">
      {celebrate && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: CONFETTI_PIECES }, (_, i) => (
            <span key={i} className="confetti__piece" style={{ "--i": i }} />
          ))}
        </div>
      )}
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
