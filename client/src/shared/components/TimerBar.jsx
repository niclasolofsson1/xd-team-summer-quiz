import { useState } from "react";
import { ProgressBar } from "@carbon/react";
import { drainStart, percentLeft, secondsLeft } from "../clock.js";
import { useNow } from "../useNow.js";

// The answer timer, on the server's clock. The bar drains with one linear CSS animation (smooth at the
// screen's frame rate); the seconds and the bar's value for screen readers update every 250 ms.
// Not announced every second (aria-live is off). Give it a new `key` per question to restart the drain.
export function TimerBar({ startedAt, endsAt, offsetMs }) {
  const now = useNow(250);
  const [drain] = useState(() => drainStart(startedAt, endsAt, offsetMs));
  return (
    <div
      className="timer-bar"
      style={{ "--drain-from": drain.fraction, "--drain-ms": `${drain.remainingMs}ms` }}
    >
      <ProgressBar
        label="Time left"
        hideLabel
        value={percentLeft(startedAt, endsAt, offsetMs, now)}
        max={100}
        helperText={`${secondsLeft(endsAt, offsetMs, now)} s`}
      />
    </div>
  );
}
