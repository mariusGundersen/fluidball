import { PeerConnection } from "./PeerConnection";

export interface ClientToHost {
  ping(): void,
  greeting(message: string): void,
  move(pos: { x: number, y: number }): void
  aim(pos: { x: number, y: number }): void
  kick(): void
}

export interface HostToClient {
  pong(): void,
  team(team: 0 | 1): void
}

export type ClientConnection = PeerConnection<ClientToHost, HostToClient>;
export type HostConnection = PeerConnection<HostToClient, ClientToHost>;