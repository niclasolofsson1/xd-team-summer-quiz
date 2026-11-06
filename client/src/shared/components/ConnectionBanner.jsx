import { ActionableNotification, InlineNotification } from "@carbon/react";

// Hidden while connected. "Reconnecting…" during a drop; "Connection lost." with Retry when it lasts.
// role="status" so the banner is announced without taking focus away from the answer tiles.
export function ConnectionBanner({ status, onRetry }) {
  if (status === "reconnecting") {
    return (
      <div className="connection-banner">
        <InlineNotification kind="warning" lowContrast hideCloseButton title="Reconnecting…" />
      </div>
    );
  }
  if (status === "lost") {
    return (
      <div className="connection-banner">
        <ActionableNotification
          inline
          kind="error"
          lowContrast
          hideCloseButton
          role="status"
          title="Connection lost."
          actionButtonLabel="Retry"
          onActionButtonClick={onRetry}
        />
      </div>
    );
  }
  return null;
}
