import { Avatar } from "../../shared/components/Avatar.jsx";
import { playersJoined } from "../../shared/format.js";

export function Lobby({ me, name, playerCount }) {
  return (
    <section className="screen screen--center lobby">
      <Avatar id={me.avatarId} size="xl" />
      <h1 className="screen__title">You're in, {name}!</h1>
      <p className="screen__lead">Waiting for the host to start.</p>
      <p className="screen__meta">{playersJoined(playerCount)}</p>
    </section>
  );
}
