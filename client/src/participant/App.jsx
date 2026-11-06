import { useEffect, useState } from "react";
import { Header, HeaderName, InlineLoading } from "@carbon/react";
import { useQuizState } from "../shared/useQuizState.js";
import { loadAnswer, loadSession, saveAnswer, saveLastName, saveSession } from "../shared/storage.js";
import { ConnectionBanner } from "../shared/components/ConnectionBanner.jsx";
import { Avatar } from "../shared/components/Avatar.jsx";
import { Join } from "./screens/Join.jsx";
import { Lobby } from "./screens/Lobby.jsx";
import { Countdown } from "./screens/Countdown.jsx";
import { Question } from "./screens/Question.jsx";
import { TimeUp } from "./screens/TimeUp.jsx";
import { Reveal } from "./screens/Reveal.jsx";
import { Leaderboard } from "./screens/Leaderboard.jsx";
import { Final } from "./screens/Final.jsx";

const RESET_NOTICE = "The quiz was reset. Join again to play.";

// What the polite live region says when the screen changes (the timer is never read out).
const ANNOUNCEMENTS = {
  lobby: "Waiting for the host to start.",
  countdown: "Get ready.",
  answering: "Question.",
  awaitingReveal: "Time's up!",
  reveal: "Answer revealed.",
  leaderboard: "Leaderboard.",
  finished: "Final results."
};

export function App() {
  const [session, setSession] = useState(loadSession);
  const [notice, setNotice] = useState("");
  // Answers the server confirmed, by question. Kept here, not in the question screen: when the last
  // player answers, the server moves on to "Time's up" before its reply reaches the phone.
  const [confirmed, setConfirmed] = useState({});
  const { state, offsetMs, stateToken, status, retry } = useQuizState(session?.token);
  const me = session && state ? state.participants.find((p) => p.id === session.id) : null;
  const questionIndex = state?.currentQuestionIndex;
  const myAnswer = session && state ? confirmed[questionIndex] ?? loadAnswer(session.id, questionIndex) : null;

  function answered(index, optionIndex) {
    saveAnswer(session.id, index, optionIndex);
    setConfirmed((current) => ({ ...current, [index]: optionIndex }));
  }

  // Only a state from this player's own stream can say the player is gone (after a reset or server restart).
  useEffect(() => {
    if (session && state && stateToken === session.token && !me) leave(RESET_NOTICE);
  }, [session, state, stateToken, me]);

  function joined(next) {
    saveSession(next);
    saveLastName(next.name);
    setNotice("");
    setConfirmed({});
    setSession(next);
  }

  function leave(message) {
    saveSession(null);
    setSession(null);
    setConfirmed({});
    setNotice(message || RESET_NOTICE);
  }

  let screen;
  let announcement = "";
  if (!state) {
    screen = (
      <section className="screen screen--center">
        <InlineLoading description="Connecting…" />
      </section>
    );
  } else if (!session || !me) {
    screen = <Join phase={state.phase} notice={notice} onJoined={joined} />;
  } else {
    announcement = ANNOUNCEMENTS[state.phase] || "";
    screen = playerScreen({ state, offsetMs, me, session, myAnswer, onAnswered: answered, onPlayerLost: leave });
  }

  return (
    <>
      <Header aria-label="XD Team Quiz">
        <HeaderName prefix="" href="/participant.html">
          XD Team Quiz
        </HeaderName>
        {me && (
          <div className="player-chip">
            <Avatar id={me.avatarId} size="sm" />
            <span className="player-chip__name">{session.name}</span>
          </div>
        )}
      </Header>
      <main className="player-main">
        {me && <ConnectionBanner status={status} onRetry={retry} />}
        <div className="visually-hidden" aria-live="polite">
          {announcement}
        </div>
        {screen}
      </main>
    </>
  );
}

function playerScreen({ state, offsetMs, me, session, myAnswer, onAnswered, onPlayerLost }) {
  const questionKey = `q-${state.currentQuestionIndex}`;
  switch (state.phase) {
    case "lobby":
      return <Lobby me={me} name={session.name} playerCount={state.participants.length} />;
    case "countdown":
      return <Countdown state={state} offsetMs={offsetMs} />;
    case "answering":
      return state.question ? (
        <Question
          key={questionKey}
          state={state}
          offsetMs={offsetMs}
          me={me}
          session={session}
          myAnswer={myAnswer}
          onAnswered={onAnswered}
          onPlayerLost={onPlayerLost}
        />
      ) : null;
    case "awaitingReveal":
      return <TimeUp state={state} myAnswer={myAnswer} />;
    case "reveal":
      return state.question ? <Reveal state={state} me={me} myAnswer={myAnswer} /> : null;
    case "leaderboard":
      return <Leaderboard state={state} me={me} />;
    case "finished":
      return <Final state={state} me={me} />;
    default:
      return null;
  }
}
