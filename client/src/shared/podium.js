// Where each player goes on the final screen, from what the server has revealed so far.
//
// The server only sends visible ranks: stage 1 shows 4th and down, stage 2 adds 3rd, stage 3 adds
// the champion and runner-up. The podium has three places (index 0 = champion, 1 = runner-up, 2 = 3rd).
// A place is "empty" when there are fewer players than places, "locked" until its stage.
// Players sharing a podium rank beyond three places are listed first in the standings.

export const PODIUM_LABELS = ["Champion", "Runner-up", "3rd place"];

export function podiumLabel(rank) {
  return PODIUM_LABELS[Math.min(Math.max(rank, 1), 3) - 1];
}

// Gold, silver, bronze by rank, so players sharing a place share its medal.
const MEDALS = ["🥇", "🥈", "🥉"];

export function medalFor(rank) {
  return MEDALS[Math.min(Math.max(rank, 1), 3) - 1];
}

export function finalLayout(leaderboard, totalPlayers, stage) {
  const podium = leaderboard.filter((entry) => entry.rank <= 3);
  const places = [0, 1, 2].map((index) => ({
    index,
    label: PODIUM_LABELS[index],
    entry: null,
    state: index < totalPlayers ? "locked" : "empty"
  }));

  let overflow = [];
  if (stage >= 3) {
    podium.slice(0, 3).forEach((entry, index) => {
      places[index] = { index, label: podiumLabel(entry.rank), entry, state: "revealed" };
    });
    overflow = podium.slice(3);
  } else if (stage === 2 && podium.length && totalPlayers >= 3) {
    places[2] = { index: 2, label: podiumLabel(podium[0].rank), entry: podium[0], state: "revealed" };
    overflow = podium.slice(1);
  }

  const standings = stage >= 1 ? [...overflow, ...leaderboard.filter((entry) => entry.rank >= 4)] : [];
  return { places, standings };
}

// Display order on the podium: runner-up, champion, 3rd.
export const PODIUM_ORDER = [1, 0, 2];
