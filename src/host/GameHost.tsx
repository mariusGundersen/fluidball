import useArrayState from "@clave/use-array-state";
import React, { useEffect, useRef } from "react";
import Div100vh from "react-div-100vh";
import QRCode from "react-qr-code";
import Game from "../Game";
import { HostConnection } from "../types";
import style from "./host.module.css";

export interface Props {
  gameKey: string;
  onClient(listener: (peer: HostConnection) => void): void;
}

export default function GameHost({ gameKey, onClient }: Props) {
  const [peers, setPeers] = useArrayState<HostConnection>([]);

  const peerCount = useRef(0);

  useEffect(() => {
    peerCount.current = peers.length;
  }, [peers]);

  useEffect(() => {
    onClient((peer) => {
      setPeers.append(peer);

      peer.on("ping", () => {
        peer.send("pong");
      });

      console.log("send team", (peerCount.current % 2) as 0 | 1);
      peer.send("team", (peerCount.current % 2) as 0 | 1);

      peer.onDisconnect(() => {
        console.log("disconnected");
        setPeers.remove(peer);
      });
    });
  }, []);
  return (
    <>
      {peers.length < 2 && (
        <div className={style.joinGamePopup}>
          <a href={`/client/index.html?key=${gameKey}`} target="_blank">
            <QRCode
              value={new URL(
                `/client/index.html?key=${gameKey}`,
                document.location.href
              ).toString()}
            />
          </a>
          <span>{peers.length}</span>
        </div>
      )}
      <Div100vh className={style.container}>
        {peers.length === 2 && <Game peers={peers} />}
      </Div100vh>
    </>
  );
}
