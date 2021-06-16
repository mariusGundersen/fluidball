import useArrayState from "@clave/use-array-state";
import React, { useEffect } from "react";
import Div100vh from "react-div-100vh";
import QRCode from "react-qr-code";
import Game from "./Game";
import style from "./host.module.css";
import { PeerConnection } from "./PeerConnection";

export interface Props {
  gameKey: string;
  onClient(listener: (peer: PeerConnection) => void): void;
}

export default function GameHost({ gameKey, onClient }: Props) {
  const [peers, setPeers] = useArrayState<PeerConnection>([]);

  useEffect(() => {
    onClient((peer) => {
      setPeers.append(peer);

      peer.onData((data) => {
        if (data.type === "ping") {
          peer.send({
            type: "pong",
          });
        } else {
          console.log(data);
        }
      });

      peer.send({
        type: "greeting",
        message: "host says hi",
      });

      peer.onDisconnect(() => {
        console.log("disconnected");
        setPeers.remove(peer);
      });
    });
  }, []);
  return (
    <>
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
      <Div100vh className={style.container}>
        {peers.length === 2 && <Game peers={peers} />}
      </Div100vh>
    </>
  );
}
