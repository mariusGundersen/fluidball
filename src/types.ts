import { PeerConnection } from "./PeerConnection";

export interface ClientToHost {
  move(pos: {
    x: number,
    y: number,
  },
    aim: {
      x: number,
      y: number
    } | null): void
}

export interface HostToClient {
  move_ack(): void,
  team(team: 0 | 1): void
}

export type ClientConnection = PeerConnection<ClientToHost, HostToClient>;
export type HostConnection = PeerConnection<HostToClient, ClientToHost>;