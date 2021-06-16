import SimplePeer, { Instance } from "simple-peer";

export interface Data {
  type: string
}

export class PeerConnection {
  private readonly peer: SimplePeer.Instance;
  constructor(peer: Instance) {
    this.peer = peer;
  }
  send(data: any) {
    this.peer.send(JSON.stringify(data));
  }
  onData<T = Data>(listener: (data: T) => void) {
    this.peer.on('data', (data => listener(JSON.parse(data))));
  }
  onDisconnect(listener: () => void) {
    this.peer.on('close', listener);
    this.peer.on('error', listener);
  }
}
