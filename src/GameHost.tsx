import useArrayState from "@clave/use-array-state";
import React, { useEffect, useRef } from "react";
import Div100vh from "react-div-100vh";
import QRCode from "react-qr-code";
import { ClientToHost, HostToClient } from "./client";
import Game from "./Game";
import style from "./host.module.css";
import { PeerConnection } from "./PeerConnection";

export interface Props {
  gameKey: string;
  onClient(
    listener: (peer: PeerConnection<HostToClient, ClientToHost>) => void
  ): void;
}

export default function GameHost({ gameKey, onClient }: Props) {
  const [peers, setPeers] = useArrayState<
    PeerConnection<HostToClient, ClientToHost>
  >([]);

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
          <a href={`/client.html?key=${gameKey}`} target="_blank">
            <QRCode
              value={new URL(
                `/client.html?key=${gameKey}`,
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
