import React, { useEffect, useRef } from "react";
import { ClientToHost, HostToClient } from "./client";
import game from "./game/game";
import { PeerConnection } from "./PeerConnection";

export interface Props {
  peers: PeerConnection<HostToClient, ClientToHost>[];
}

export default function Game({ peers }: Props) {
  const ref = useRef<HTMLCanvasElement>();

  useEffect(() => {
    game(ref.current, peers);
  }, [ref]);

  return <canvas ref={ref} />;
}
