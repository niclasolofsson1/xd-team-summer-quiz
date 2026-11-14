import { Tag } from "@carbon/react";
import { topBarMeta } from "./displayView.js";

// "XD Team Quiz" on the left; on the right the connection (only when it's down), the question number
// and the player or answered count.
export function TopBar({ state, status }) {
  const meta = topBarMeta(state);
  return (
    <header className="ds-bar">
      <span className="ds-bar__name">XD Team Quiz</span>
      <span className="ds-bar__meta">
        {status === "reconnecting" && <Tag type="gray">Reconnecting…</Tag>}
        {status === "lost" && <Tag type="red">Connection lost</Tag>}
        {meta.question && <span>{meta.question}</span>}
        {state && <span>{meta.count}</span>}
      </span>
    </header>
  );
}
