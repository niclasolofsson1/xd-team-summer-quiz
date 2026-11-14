import { useEffect, useState } from "react";
import { useQuizState } from "../shared/useQuizState.js";
import { TopBar } from "./TopBar.jsx";
import { Lobby } from "./screens/Lobby.jsx";
import { Countdown } from "./screens/Countdown.jsx";
import { Question } from "./screens/Question.jsx";
import { Reveal } from "./screens/Reveal.jsx";
import { Leaderboard } from "./screens/Leaderboard.jsx";
import { Final } from "./screens/Final.jsx";

// The big screen (projector/TV, Carbon g100). No controls: it follows the quiz over the same live
// connection as the phones (no player token). 16:9, never scrolls; type scales with the screen.

const ANNOUNCEMENTS = {
  lobby: "Waiting for players.",
  countdown: "Get ready.",
  answering: "Question.",
  awaitingReveal: "Time's up!",
  reveal: "Answer revealed.",
  leaderboard: "Leaderboard.",
  finished: "Final results."
};

// The join address comes from the server (PUBLIC_URL, or the laptop's Wi-Fi address). Retried until it arrives.
function useJoinUrl() {
  const [joinUrl, setJoinUrl] = useState("");
  useEffect(() => {
    let stopped = false;
    let timer;
    async function load() {
      try {
        const res = await fetch("/api/join-info", { cache: "no-store" });
        const data = await res.json();
        if (!stopped && data.joinUrl) return setJoinUrl(data.joinUrl);
      } catch {
        // Server not reachable yet; try again shortly.
      }
      if (!stopped) timer = setTimeout(load, 5000);
    }
    load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);
  return joinUrl;
}

function Screen({ state, offsetMs, joinUrl }) {
  switch (state.phase) {
    case "lobby":
      return <Lobby state={state} joinUrl={joinUrl} />;
    case "countdown":
      return <Countdown state={state} offsetMs={offsetMs} />;
    case "answering":
    case "awaitingReveal":
      return <Question key={state.currentQuestionIndex} state={state} offsetMs={offsetMs} />;
    case "reveal":
      return <Reveal state={state} />;
    case "leaderboard":
      return <Leaderboard state={state} />;
    case "finished":
      return <Final state={state} />;
    default:
      return null;
  }
}

export function App() {
  const { state, offsetMs, status } = useQuizState(null);
  const joinUrl = useJoinUrl();

  return (
    <div className="ds">
      <TopBar state={state} status={status} />
      <main className="ds-main">
        {state ? (
          <Screen state={state} offsetMs={offsetMs} joinUrl={joinUrl} />
        ) : (
          <p className="ds-connecting">Connecting…</p>
        )}
      </main>
      <p className="visually-hidden" aria-live="polite">
        {state ? ANNOUNCEMENTS[state.phase] : ""}
      </p>
    </div>
  );
}
