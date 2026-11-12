import { useEffect, useState } from "react";
import { Button, InlineLoading, TextInput } from "@carbon/react";
import { getJson, hostAction } from "./hostApi.js";
import { loadHostPin, saveHostPin } from "../shared/storage.js";

// Asks the server whether a PIN is needed. Without one the dashboard opens at once; a saved PIN is
// checked again (a server restarted with a new PIN clears it and shows the form).
export function PinGate({ onUnlocked, notice }) {
  const [mode, setMode] = useState("checking"); // checking | form
  const [pin, setPin] = useState("");
  const [error, setError] = useState(notice || "");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { hostPinRequired } = await getJson("/api/host-status");
        if (cancelled) return;
        if (!hostPinRequired) return onUnlocked("");
        const saved = loadHostPin();
        if (saved) {
          const result = await hostAction("host-unlock", saved);
          if (cancelled) return;
          if (result.ok) return onUnlocked(saved);
          saveHostPin(null);
        }
      } catch {
        if (!cancelled) setError("Couldn't reach the quiz server. Try again.");
      }
      if (!cancelled) setMode("form");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (!pin.trim()) return setError("Enter the host PIN.");
    setSending(true);
    const result = await hostAction("host-unlock", pin.trim());
    setSending(false);
    if (result.ok) {
      saveHostPin(pin.trim());
      onUnlocked(pin.trim());
    } else {
      setError(result.message);
    }
  }

  return (
    <main className="host-gate">
      {mode === "checking" ? (
        <InlineLoading description="Connecting…" />
      ) : (
        <form className="host-gate__card" onSubmit={submit} noValidate>
          <h1 className="host-gate__title">Host access</h1>
          <p className="host-gate__lead">Enter the host PIN to open the quiz dashboard.</p>
          <TextInput
            id="host-pin"
            type="password"
            labelText="Host PIN"
            autoComplete="current-password"
            value={pin}
            onChange={(event) => {
              setPin(event.target.value);
              setError("");
            }}
            invalid={Boolean(error)}
            invalidText={error}
            autoFocus
          />
          {sending ? (
            <InlineLoading description="Checking…" />
          ) : (
            <Button type="submit" size="lg">
              Open dashboard
            </Button>
          )}
        </form>
      )}
    </main>
  );
}
