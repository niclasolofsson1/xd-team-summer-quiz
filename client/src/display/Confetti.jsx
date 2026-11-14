// CSS-only confetti on the champion stage (user's choice in v1.4.0: it keeps falling while the champion
// is on screen). Pieces loop with staggered start times, so it never comes in waves. Decorative only;
// display.scss turns it off with reduced motion.

const COLORS = ["var(--quiz-answer-a)", "var(--quiz-answer-b)", "var(--quiz-answer-c)", "var(--quiz-answer-d)", "#f1c21b", "#ffffff"];
const COUNT = 60;

// Fixed pseudo-random spread, the same on every render.
function pieces() {
  let seed = 3;
  const next = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  return Array.from({ length: COUNT }, (_, i) => ({
    left: `${(next() * 100).toFixed(1)}%`,
    background: COLORS[i % COLORS.length],
    "--d": `${(4 + next() * 3).toFixed(2)}s`,
    "--w": `${(-next() * 7).toFixed(2)}s`,
    "--x": `${(next() * 16 - 8).toFixed(1)}rem`,
    "--r": `${Math.round(next() * 720 - 360)}deg`
  }));
}

const PIECES = pieces();

export function Confetti() {
  return (
    <div className="ds-confetti" aria-hidden="true">
      {PIECES.map((style, i) => (
        <i key={i} style={style} />
      ))}
    </div>
  );
}
