import { diff } from "fast-array-diff";
import React, { useEffect, useRef } from "react";
import Game from "./game/GameBla";
import { HostConnection } from "./types";

export interface Props {
  peers: HostConnection[];
}

export default function GameCanvas({ peers }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game>();

  useEffect(() => {
    if (ref.current) {
      game.current = new Game(ref.current);
      for (const add of peers) {
        game.current!.addPlayer(add);
      }

      return () => {
        game.current!.destroy();
      };
    }
  }, []);

  const oldPeers = useRef(peers);
  useEffect(() => {
    const { removed, added } = diff(oldPeers.current, peers);
    for (const remove of removed) {
      game.current!.removePlayerAt(oldPeers.current.indexOf(remove));
    }
    for (const add of added) {
      game.current!.addPlayer(add);
    }
    oldPeers.current = peers;
  }, [peers]);

  return <canvas ref={ref} />;
}
