import { StructuredListBody, StructuredListCell, StructuredListRow, StructuredListWrapper } from "@carbon/react";
import { Avatar } from "./Avatar.jsx";
import { rankLabel } from "../format.js";

function Row({ entry, isMe }) {
  return (
    <StructuredListRow className={isMe ? "leaderboard__row leaderboard__row--me" : "leaderboard__row"}>
      <StructuredListCell className="leaderboard__rank">{rankLabel(entry.rank, entry.tied)}</StructuredListCell>
      <StructuredListCell className="leaderboard__player">
        <Avatar id={entry.avatarId} size="sm" />
        <span className="leaderboard__name">
          {entry.name}
          {isMe && <span className="visually-hidden"> (you)</span>}
        </span>
      </StructuredListCell>
      <StructuredListCell className="leaderboard__score">{entry.score}</StructuredListCell>
    </StructuredListRow>
  );
}

// The top `limit` entries, plus this player's own row pinned below when it falls outside them.
export function Leaderboard({ entries, meId, limit = 10, label = "Leaderboard" }) {
  const top = entries.slice(0, limit);
  const mine = entries.find((entry) => entry.id === meId);
  const pinned = mine && !top.includes(mine) ? mine : null;
  return (
    <StructuredListWrapper className="leaderboard" aria-label={label} isCondensed>
      <StructuredListBody>
        {top.map((entry) => (
          <Row key={entry.id} entry={entry} isMe={entry.id === meId} />
        ))}
        {pinned && (
          <>
            <StructuredListRow className="leaderboard__gap" aria-hidden="true">
              <StructuredListCell>…</StructuredListCell>
            </StructuredListRow>
            <Row entry={pinned} isMe />
          </>
        )}
      </StructuredListBody>
    </StructuredListWrapper>
  );
}
