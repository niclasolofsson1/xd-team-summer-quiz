import { Header, HeaderGlobalBar, HeaderName, OverflowMenu, OverflowMenuItem } from "@carbon/react";

const CONNECTION = {
  connecting: "Connecting…",
  connected: "Connected",
  reconnecting: "Reconnecting…",
  lost: "Connection lost"
};

// Carbon's "header only" global header: the title, then the global actions (the connection, and Reset
// tucked away in the menu). Where the quiz is lives in the page itself, not here.
export function HostHeader({ status, onReset }) {
  return (
    <Header aria-label="XD Team Quiz host" className="host-header">
      <HeaderName prefix="" href="/host.html">
        XD Team Quiz
      </HeaderName>
      <HeaderGlobalBar className="host-header__bar">
        <p className="host-header__connection" role="status">
          <span className={`status-dot status-dot--${status}`} aria-hidden="true" />
          <span className="host-header__connection-text">{CONNECTION[status] || CONNECTION.connecting}</span>
        </p>
        <OverflowMenu
          aria-label="Quiz menu"
          iconDescription="Quiz menu"
          flipped
          size="lg"
          className="host-header__menu"
        >
          <OverflowMenuItem itemText="Reset quiz…" isDelete hasDivider={false} onClick={onReset} />
        </OverflowMenu>
      </HeaderGlobalBar>
    </Header>
  );
}
