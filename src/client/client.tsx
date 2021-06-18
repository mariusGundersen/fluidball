import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { ClientConnection } from "../types";
//import style from "./client.module.css";
import clientConnection from "./clientConnection";
import GamePad from "./GamePad";

ReactDOM.render(<Client />, document.body);

function Client() {
  const [team, setTeam] = useState<number>(-1);
  const [connection, setConnection] = useState<ClientConnection>();

  useEffect(() => {
    const query = new URLSearchParams(document.location.search);
    clientConnection(query.get("key") ?? "ABCD").then(setConnection);
  }, []);

  useEffect(() => {
    connection?.once("team").then(setTeam);
  }, [connection]);

  console.log("team", team);

  const color = team === 0 ? "red" : team === 1 ? "blue" : "";

  return connection && color ? (
    <GamePad color={color} connection={connection} />
  ) : (
    <span>Connecting...</span>
  );
}
