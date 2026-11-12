import { Button, InlineNotification } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";

// The control column: where the quiz is, what happens next, and the one primary step.
// The primary button is fluid: it bleeds to the panel's edges (Carbon's xl size for that), label left,
// arrow right. While it's disabled, the hint above it says what unlocks it (Carbon's disabled-state rule).
export function ControlPanel({ step, busy, error, onPrimary, children }) {
  return (
    <section className="host-panel control-panel" aria-labelledby="stage-title">
      <div className="control-panel__top">
        <p className="control-panel__eyebrow">{step.eyebrow}</p>
        <h1 id="stage-title" className="control-panel__title">
          {step.title}
        </h1>
      </div>
      {children && <div className="control-panel__body">{children}</div>}
      <div className="control-panel__foot">
        {error && (
          <InlineNotification kind="error" lowContrast hideCloseButton title={error} className="control-panel__error" />
        )}
        {step.hint && <p className="control-panel__hint">{step.hint}</p>}
        <Button
          kind="primary"
          size="xl"
          className="control-panel__primary"
          disabled={!step.enabled || busy}
          onClick={onPrimary}
          renderIcon={ArrowRight}
          aria-keyshortcuts="ArrowRight PageDown Space"
        >
          {busy ? "Sending…" : step.label}
        </Button>
      </div>
    </section>
  );
}
