import React, { useEffect, useState } from "react";
import Div100vh from "react-div-100vh";
import ReactDOM from "react-dom";
import { ClientConnection } from "../types";
import clientConnection from "./clientConnection";
import GamePad from "./GamePad";

ReactDOM.render(<Client />, document.body);

function Client() {
  const [team, setTeam] = useState<number>(-1);
  const [connection, setConnection] = useState<ClientConnection>();
  const [disconnected, setDisconnected] =
    useState<string | undefined>(undefined);

  useEffect(() => {
    const query = new URLSearchParams(document.location.search);
    clientConnection(query.get("key") ?? "ABCD").then(
      setConnection,
      setDisconnected
    );
  }, []);

  useEffect(() => {
    connection?.once("team").then(setTeam);
    connection?.onDisconnect((message) => {
      setConnection(undefined);
      setDisconnected(message ?? "Network error");
    });
  }, [connection]);

  const color = team === 0 ? "red" : team === 1 ? "blue" : "";

  if (disconnected) {
    return (
      <Div100vh className="content">
        <div style={{ color: "red" }}>
          <h3>Disconnected!</h3>
          <pre>{disconnected}</pre>
        </div>
      </Div100vh>
    );
  }

  return connection && color ? (
    <GamePad color={color} connection={connection} />
  ) : (
    <Div100vh className="content">
      <h3>Connecting...</h3>
    </Div100vh>
  );
}
