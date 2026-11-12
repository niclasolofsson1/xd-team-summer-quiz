import { useEffect, useState } from "react";
import { Button, CopyButton } from "@carbon/react";
import { Launch } from "@carbon/icons-react";
import { getJson } from "./hostApi.js";

// The address players open on their phones (from the server: PUBLIC_URL, or the laptop's network
// address on localhost), with Copy, and a link to open the big screen in a new tab.
export function JoinPanel({ playerCount }) {
  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    getJson("/api/join-info")
      .then((info) => setJoinUrl(info.joinUrl || ""))
      .catch(() => setJoinUrl(`${window.location.origin}/participant.html`));
  }, []);

  return (
    <section className="host-card join-panel" aria-labelledby="join-title">
      <h2 id="join-title" className="host-card__title">
        Join the quiz
      </h2>
      <p className="join-panel__label">Players open</p>
      <div className="join-panel__link">
        <code className="join-panel__url">{joinUrl || "…"}</code>
        <CopyButton
          iconDescription="Copy join link"
          feedback="Copied"
          disabled={!joinUrl}
          onClick={() => navigator.clipboard?.writeText(joinUrl).catch(() => {})}
        />
      </div>
      <p className="join-panel__count">{playerCount === 1 ? "1 player joined" : `${playerCount} players joined`}</p>
      <Button kind="tertiary" size="md" href="/display.html" target="_blank" rel="noopener" renderIcon={Launch}>
        Open display screen
      </Button>
    </section>
  );
}
