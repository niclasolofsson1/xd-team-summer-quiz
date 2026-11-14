import { Avatar } from "../../shared/components/Avatar.jsx";
import { playersJoined } from "../../shared/format.js";
import { QrCode } from "../QrCode.jsx";
import { displayUrl, wallEntries } from "../displayView.js";

export function Lobby({ state, joinUrl }) {
  const { shown, more } = wallEntries(state.participants);
  const count = state.participants.length;
  return (
    <div className="ds-lobby">
      <section className="ds-join">
        <h1 className="ds-join__title">Join on your phone</h1>
        <div className="ds-qr">{joinUrl && <QrCode url={joinUrl} />}</div>
        <p className="ds-join__url">{joinUrl ? displayUrl(joinUrl) : "…"}</p>
        <p className="ds-join__hint">Scan the code or type the address. Same Wi-Fi as the host.</p>
      </section>
      <section className="ds-wall" aria-label="Players">
        <h2 className="ds-wall__title">{count ? playersJoined(count) : "Players"}</h2>
        {count ? (
          <ul className="ds-wall__grid">
            {shown.map((p) => (
              <li key={p.id} className="ds-chip">
                <Avatar id={p.avatarId} size="md" />
                <span className="ds-chip__name">{p.name}</span>
              </li>
            ))}
            {more > 0 && <li className="ds-chip ds-chip--more">+{more} more</li>}
          </ul>
        ) : (
          <div className="ds-empty">
            <span>No one has joined yet.</span>
            <span>Players appear here as they join.</span>
          </div>
        )}
      </section>
    </div>
  );
}
