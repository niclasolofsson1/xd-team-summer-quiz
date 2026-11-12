import { Avatar } from "../shared/components/Avatar.jsx";

const SEATS = 8;

// Lobby: everyone who joined, as large avatars with names; the newest one is ringed.
// Before anyone joins: Carbon's empty-state pattern (placeholder seats, a title, what to do).
export function PlayerWall({ players }) {
  const count = players.length;
  return (
    <section className={`host-panel player-wall${count ? "" : " player-wall--empty"}`} aria-labelledby="wall-title">
      <div className="player-wall__head">
        <h2 id="wall-title" className="host-panel__title">
          Players
        </h2>
        <p className="player-wall__count" aria-live="polite">
          {count} joined
        </p>
      </div>
      {count ? (
        <ul className="player-wall__grid">
          {players.map((player, index) => (
            <li key={player.id} className={`player-wall__who${index === count - 1 ? " player-wall__who--new" : ""}`}>
              <Avatar id={player.avatarId} size="lg" />
              <span className="player-wall__name">{player.name}</span>
              {!player.connected && <span className="player-wall__offline">Offline</span>}
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="player-wall__grid" aria-hidden="true">
            {Array.from({ length: SEATS }, (_, index) => (
              <div key={index} className="player-wall__who">
                <span className="player-wall__seat" />
                <span className="player-wall__seat-name" />
              </div>
            ))}
          </div>
          <div className="player-wall__empty">
            <p className="player-wall__empty-title">Waiting for the first player</p>
            <p className="player-wall__empty-body">
              Players appear here as they join. Share the link above, or open the display screen so the room can scan
              the QR code.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
