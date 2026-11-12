import { Header, HeaderGlobalBar, HeaderName, OverflowMenu, OverflowMenuItem, Tag } from "@carbon/react";
import { phaseLabel } from "./hostSteps.js";

const CONNECTION = {
  connecting: { type: "gray", text: "Connecting…" },
  connected: { type: "green", text: "Connected" },
  reconnecting: { type: "warm-gray", text: "Reconnecting…" },
  lost: { type: "red", text: "Connection lost" }
};

// "XD Team Quiz", the phase, the question set, the connection, and Reset tucked away in the menu.
export function HostHeader({ state, status, onReset }) {
  const connection = CONNECTION[status] || CONNECTION.connecting;
  const testSet = state?.questionSetId === "test";
  return (
    <Header aria-label="XD Team Quiz host" className="host-header">
      <HeaderName prefix="" href="/host.html">
        XD Team Quiz
      </HeaderName>
      <div className="host-header__tags">
        {state && (
          <>
            <Tag type="blue" size="md" className="host-header__phase">
              {phaseLabel(state.phase)}
            </Tag>
            <Tag type={testSet ? "magenta" : "cool-gray"} size="md">
              {state.questionSetName}
            </Tag>
          </>
        )}
      </div>
      <HeaderGlobalBar className="host-header__bar">
        <Tag type={connection.type} size="md" className="host-header__connection" role="status">
          <span className={`status-dot status-dot--${status}`} aria-hidden="true" />
          {connection.text}
        </Tag>
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
