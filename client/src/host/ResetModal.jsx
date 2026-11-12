import { Modal } from "@carbon/react";

// Carbon danger modal: Reset wipes players, scores and settings, in any phase.
export function ResetModal({ open, busy, error, onClose, onConfirm }) {
  return (
    <Modal
      open={open}
      danger
      size="sm"
      modalHeading="Reset the quiz?"
      primaryButtonText={busy ? "Resetting…" : "Reset quiz"}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={busy}
      onRequestClose={onClose}
      onRequestSubmit={onConfirm}
    >
      <p>
        All players and scores are removed and the quiz goes back to an empty lobby. The question set and answer time go back
        to Test questions and 15 s. Players have to join again.
      </p>
      {error && <p className="reset-modal__error">{error}</p>}
    </Modal>
  );
}
