import { useEffect, useRef, useState } from "react";
import { Button } from "@carbon/react";
import { Copy, Launch } from "@carbon/icons-react";
import { getJson } from "./hostApi.js";

// The lobby's first thing: the address players open on their phones (from the server: PUBLIC_URL, or the
// laptop's network address on localhost), large, with Copy, and a link to open the big screen.
export function JoinPanel() {
  const [joinUrl, setJoinUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    getJson("/api/join-info")
      .then((info) => setJoinUrl(info.joinUrl || ""))
      .catch(() => setJoinUrl(`${window.location.origin}/participant.html`));
    return () => clearTimeout(timer.current);
  }, []);

  function copy() {
    navigator.clipboard
      ?.writeText(joinUrl)
      .then(() => {
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  // Break the address after "//" and before the page name, so it wraps at sensible places.
  const shown = joinUrl.replace(/^https?:\/\//, "");
  const cut = shown.lastIndexOf("/") + 1;

  return (
    <section className="host-panel join-panel" aria-labelledby="join-title">
      <h2 id="join-title" className="join-panel__label">
        Players join on their phones at
      </h2>
      <p className="join-panel__url" data-url={joinUrl}>
        {joinUrl ? (
          <>
            {shown.slice(0, cut)}
            <wbr />
            <b>{shown.slice(cut)}</b>
          </>
        ) : (
          "…"
        )}
      </p>
      <div className="join-panel__actions">
        <Button kind="secondary" size="lg" renderIcon={Copy} disabled={!joinUrl} onClick={copy} className="join-panel__copy">
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button kind="ghost" size="lg" href="/display.html" target="_blank" rel="noopener" renderIcon={Launch}>
          Open display screen
        </Button>
        <span className="visually-hidden" aria-live="polite">
          {copied ? "Join link copied" : ""}
        </span>
      </div>
    </section>
  );
}
