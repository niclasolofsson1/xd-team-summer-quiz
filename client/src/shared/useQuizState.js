import { useEffect, useRef, useState } from "react";
import { createLiveConnection } from "./liveConnection.js";
import { clockOffset } from "./clock.js";

export function eventsUrl(token) {
  return token ? `/events?token=${encodeURIComponent(token)}` : "/events";
}

export function tokenFromUrl(url) {
  return new URLSearchParams(url.split("?")[1] || "").get("token");
}

// The latest quiz state from the server, the connection status, and the offset between the
// server's clock and this device's. `stateToken` is the token of the stream the state came from,
// so a state sent before this phone joined is never mistaken for "this player is gone".
export function useQuizState(token) {
  const [live, setLive] = useState({ state: null, offsetMs: 0, stateToken: null });
  const [status, setStatus] = useState("connecting");
  const connection = useRef(null);
  const firstToken = useRef(token);

  useEffect(() => {
    const conn = createLiveConnection({
      url: eventsUrl(firstToken.current),
      onStatus: setStatus,
      onState: (state, { receivedAt, url }) => {
        setLive({ state, offsetMs: clockOffset(state.serverNow, receivedAt), stateToken: tokenFromUrl(url) });
      }
    });
    connection.current = conn;
    return () => conn.close();
  }, []);

  useEffect(() => {
    connection.current?.setUrl(eventsUrl(token));
  }, [token]);

  return { ...live, status, retry: () => connection.current?.retry() };
}
