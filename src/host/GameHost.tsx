import useArrayState from "@clave/use-array-state";
import React, { useEffect, useRef } from "react";
import Div100vh from "react-div-100vh";
import QRCode from "react-qr-code";
import GameCanvas from "../GameCanvas";
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
    onClient(async (peer) => {
      setPeers.append(peer);

      await new Promise((r) => setTimeout(r, 1000));

      peer.send("team", ((peerCount.current + 1) % 2) as 0 | 1);

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
          <div>
            <a href={`/client/index.html?key=${gameKey}`} target="_blank">
              <QRCode
                value={new URL(
                  `/client/index.html?key=${gameKey}`,
                  document.location.href
                ).toString()}
              />
            </a>
            {peers.length == 0 ? (
              <span style={{ fontWeight: "bold", color: "red" }}>
                Waiting for player 1
              </span>
            ) : (
              <span style={{ fontWeight: "bold", color: "blue" }}>
                Waiting for player 2
              </span>
            )}
          </div>
        </div>
      )}
      <Div100vh className={style.container}>
        <GameCanvas peers={peers} />
      </Div100vh>
    </>
  );
}
