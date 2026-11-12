import { useEffect, useRef, useState } from "react";
import { InlineLoading } from "@carbon/react";
import { useQuizState } from "../shared/useQuizState.js";
import { ConnectionBanner } from "../shared/components/ConnectionBanner.jsx";
import { saveHostPin } from "../shared/storage.js";
import { hostAction } from "./hostApi.js";
import { hostStep } from "./hostSteps.js";
import { createClicker } from "./clicker.js";
import { PinGate } from "./PinGate.jsx";
import { HostHeader } from "./HostHeader.jsx";
import { ControlPanel } from "./ControlPanel.jsx";
import { StageView } from "./StageView.jsx";
import { SetupFields } from "./SetupFields.jsx";
import { JoinPanel } from "./JoinPanel.jsx";
import { PlayerWall } from "./PlayerWall.jsx";
import { PlayersPanel } from "./PlayersPanel.jsx";
import { ResetModal } from "./ResetModal.jsx";

export function App() {
  // null = locked; "" = unlocked on a server without a PIN.
  const [pin, setPin] = useState(null);
  const [gateNotice, setGateNotice] = useState("");

  function lock(message) {
    saveHostPin(null);
    setPin(null);
    setGateNotice(message || "");
  }

  if (pin === null) {
    return (
      <PinGate
        key={gateNotice}
        notice={gateNotice}
        onUnlocked={(value) => {
          setGateNotice("");
          setPin(value);
        }}
      />
    );
  }
  return <Dashboard pin={pin} onLocked={lock} />;
}

function Dashboard({ pin, onLocked }) {
  const { state, offsetMs, status, retry } = useQuizState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetError, setResetError] = useState("");
  const [preview, setPreview] = useState(null);
  const inFlight = useRef(false);
  const step = hostStep(state);
  const phase = state?.phase;
  const stage = state?.finalRevealStage;
  const lobby = phase === "lobby";

  // One request at a time; a 403 means the PIN stopped working (server restarted with a new one).
  async function send(action, body) {
    if (inFlight.current) return null;
    inFlight.current = true;
    setBusy(true);
    setError("");
    const result = await hostAction(action, pin, body);
    inFlight.current = false;
    setBusy(false);
    if (result.status === 403) {
      onLocked(result.message);
      return result;
    }
    if (!result.ok) setError(result.message);
    return result;
  }

  function primary() {
    if (step.enabled && step.action) send(step.action);
  }

  // The latest primary step, for the key handler registered once below.
  const primaryRef = useRef(primary);
  primaryRef.current = primary;
  const resetOpenRef = useRef(resetOpen);
  resetOpenRef.current = resetOpen;

  useEffect(() => {
    const handle = createClicker({ onTrigger: () => primaryRef.current() });
    const onKeyDown = (event) => handle(event, { dialogOpen: resetOpenRef.current });
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // A step error belongs to the step it came from.
  useEffect(() => setError(""), [phase, stage]);

  // The private podium preview, fetched again at each stage of the final reveal.
  useEffect(() => {
    if (phase !== "finished" || stage >= 3) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    hostAction("final-preview", pin).then((result) => {
      if (cancelled) return;
      if (result.status === 403) return onLocked(result.message);
      if (result.ok) setPreview(result.data.leaderboard || []);
    });
    return () => {
      cancelled = true;
    };
  }, [phase, stage, pin]);

  async function confirmReset() {
    setResetError("");
    const result = await send("reset");
    if (result?.ok) setResetOpen(false);
    else if (result && result.status !== 403) setResetError(result.message);
  }

  return (
    <>
      <HostHeader
        status={status}
        onReset={() => {
          setResetError("");
          setResetOpen(true);
        }}
      />
      <main className="host-main">
        <ConnectionBanner status={status} onRetry={retry} />
        {!state ? (
          <div className="host-main__loading">
            <InlineLoading description="Connecting…" />
          </div>
        ) : (
          // Carbon 2x grid: the main area (10 of 16 columns) and one control column (6). In the lobby the
          // join address and the player wall lead; during the game the question takes centre stage.
          <div className={`host-grid host-grid--${lobby ? "lobby" : "game"}`}>
            {lobby ? (
              <>
                <JoinPanel />
                <PlayerWall players={state.participants} />
              </>
            ) : (
              <StageView state={state} offsetMs={offsetMs} preview={preview} />
            )}
            <ControlPanel step={step} busy={busy} error={error} onPrimary={primary}>
              {lobby && (
                <SetupFields
                  state={state}
                  busy={busy}
                  onSetQuestionSet={(questionSetId) => send("set-question-set", { questionSetId })}
                  onSetAnswerTime={(answerSeconds) => send("set-answer-time", { answerSeconds })}
                />
              )}
            </ControlPanel>
            {!lobby && <PlayersPanel state={state} />}
          </div>
        )}
      </main>
      <ResetModal
        open={resetOpen}
        busy={busy}
        error={resetError}
        onClose={() => setResetOpen(false)}
        onConfirm={confirmReset}
      />
    </>
  );
}
