import { useState } from "react";
import { Button, InlineLoading, InlineNotification, RadioTile, TextInput, TileGroup } from "@carbon/react";
import { avatars } from "../../shared/avatars.js";
import { postWithRetry } from "../../shared/api.js";
import { loadLastName } from "../../shared/storage.js";

const NAME_ERRORS = new Set(["Enter a name.", "That name is already taken."]);
const STARTED = "The quiz has started. Playing already? Enter the same name to rejoin.";

// Name and avatar in one step. The name is owned by this screen alone, so live updates never clear it.
export function Join({ phase, notice, onJoined }) {
  const [name, setName] = useState(loadLastName);
  const [avatarId, setAvatarId] = useState(avatars[0].id);
  const [sending, setSending] = useState(false);
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (sending) return;
    const clean = name.trim();
    setFormError("");
    if (!clean) {
      setNameError("Enter a name.");
      return;
    }
    setNameError("");
    setSending(true);
    const result = await postWithRetry("join", { name: clean, avatarId });
    setSending(false);
    if (result.ok) {
      onJoined({ id: result.data.id, token: result.data.token, name: clean });
      return;
    }
    const message = result.data.message;
    if (NAME_ERRORS.has(message)) setNameError(message);
    else setFormError(message || "Couldn't reach the quiz. Check your connection and try again.");
  }

  const started = phase && phase !== "lobby";

  return (
    <form className="screen join" onSubmit={submit} noValidate>
      <h1 className="screen__title">Join the quiz</h1>
      {notice && <InlineNotification kind="info" lowContrast hideCloseButton title={notice} />}
      {started && formError !== STARTED && (
        <InlineNotification kind="info" lowContrast hideCloseButton title={STARTED} />
      )}
      <TextInput
        id="player-name"
        labelText="Your name"
        size="lg"
        value={name}
        maxLength={28}
        autoComplete="nickname"
        invalid={Boolean(nameError)}
        invalidText={nameError}
        onChange={(event) => setName(event.target.value)}
      />
      <TileGroup
        name="avatar"
        legend="Pick an avatar"
        className="cds--tile-group avatar-grid"
        valueSelected={avatarId}
        onChange={(value) => setAvatarId(value)}
      >
        {avatars.map((avatar) => (
          <RadioTile key={avatar.id} id={`avatar-${avatar.id}`} value={avatar.id} className="avatar-grid__tile">
            <span className="avatar-grid__emoji" style={{ "--avatar-bg": avatar.color }} aria-hidden="true">
              {avatar.emoji}
            </span>
            <span className="visually-hidden">{avatar.label}</span>
          </RadioTile>
        ))}
      </TileGroup>
      {formError && <InlineNotification kind="error" lowContrast hideCloseButton title={formError} />}
      <Button type="submit" size="lg" className="screen__action" disabled={sending}>
        {sending ? <InlineLoading description="Joining…" /> : "Join"}
      </Button>
    </form>
  );
}
