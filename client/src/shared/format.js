export const OPTION_LETTERS = ["A", "B", "C", "D"];

export function ordinal(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
}

// "3rd", or "=5th" for a shared rank.
export function rankLabel(rank, tied = false) {
  return `${tied ? "=" : ""}${ordinal(rank)}`;
}

export function playersJoined(n) {
  return n === 1 ? "1 player joined" : `${n} players joined`;
}

export function pointsLabel(points) {
  return points === 1 ? "1 point" : `${points} points`;
}

export function pickedLabel(n) {
  return n === 1 ? "1 pick" : `${n} picks`;
}
