import { ProgressBar } from "@carbon/react";
import { percentLeft, secondsLeft } from "../clock.js";
import { useNow } from "../useNow.js";

// The answer timer, on the server's clock. Not announced every second (aria-live is off).
export function TimerBar({ startedAt, endsAt, offsetMs }) {
  const now = useNow(250);
  const seconds = secondsLeft(endsAt, offsetMs, now);
  return (
    <div className="timer-bar">
      <ProgressBar
        label="Time left"
        hideLabel
        value={percentLeft(startedAt, endsAt, offsetMs, now)}
        max={100}
        helperText={`${seconds} s`}
      />
    </div>
  );
}
