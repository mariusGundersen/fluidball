import SimplePeer, { Instance } from 'simple-peer';
import { io } from 'socket.io-client';
import { ClientToHost, HostToClient } from './client';
import { PeerConnection } from "./PeerConnection";

export interface Result {
  readonly key: string;
  onClient(listener: (peer: PeerConnection<HostToClient, ClientToHost>) => void): void;
}

export default function hostListener(): Promise<Result> {
  const connectionListeners: ((peer: PeerConnection<HostToClient, ClientToHost>) => void)[] = [];
  const peers = new Map<string, Instance>()
  const socket = io();

  socket.emit('host');

  socket.on('client', id => {
    console.log('client connnected', id);
    const peer = new SimplePeer({
      initiator: true,
      objectMode: true,
      trickle: false
    });

    peers.set(id, peer);

    peer
      .on('signal', data => socket.emit('signalToClient', id, data))
      .on('connect', () => connectionListeners.forEach(listener => listener(new PeerConnection(peer))))
  });

  socket.on('signal', (id, signal) => {
    const peer = peers.get(id);

    if (!peer) {
      console.error('signal to peer that does not exist');
      return;
    }

    peer.signal(signal);
  });

  return new Promise((resolve) => {

    socket
      .once('key', (key) => {
        resolve({
          key,
          onClient(listener: (peer: PeerConnection<HostToClient, ClientToHost>) => void) {
            connectionListeners.push(listener);
          }
        });
      });
  });
}
