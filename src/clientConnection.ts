import SimplePeer from "simple-peer";
import { io, Socket } from "socket.io-client";
import { PeerConnection } from "./PeerConnection";

interface ListenerEvents {
  signal(data: any): void,
  error(err: any): void
}

export interface EmitEvents {
  client(key: string): void,
  signalToHost(key: string, data: any): void
}

type State =
  | 'initial'
  | 'socketConnected'
  | 'signalReceived'
  | 'signalSent'
  | 'peerConnected'
  | 'error';

export default function clientConnection<Send, Receive>(key: string): Promise<PeerConnection<Send, Receive>> {

  console.log(key);

  return new Promise<PeerConnection<Send, Receive>>((resolve, reject) => {
    let state: State = 'initial';

    const socket: Socket<ListenerEvents, EmitEvents> = io();
    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      objectMode: true
    });

    socket
      .on('connect', () => {
        if (state === 'initial') {
          state = 'socketConnected';
          socket.emit('client', key);
        }
      })
      .on('signal', data => {
        if (state === 'socketConnected') {
          state = 'signalReceived';
          peer.signal(data);
        }
      })
      .on('error', err => {
        state = 'error';
        reject(err);
      });

    peer
      .on('signal', data => {
        if (state === 'signalReceived') {
          state = 'signalSent';
          socket.emit('signalToHost', key, data);
        }
      })
      .on('connect', () => {
        if (state === 'signalSent') {
          state = 'peerConnected';
          resolve(new PeerConnection(peer));
        }
      })
      .on('error', err => {
        state = 'error';
        reject(err);
      });
  });
}