import SimplePeer from "simple-peer";
import { io, Socket } from "socket.io-client";

export interface ClientConnection {
  send(data: string): void,
  onData(listener: (data: string) => void): void
}

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

export default function clientConnection(key: string): Promise<ClientConnection> {

  console.log(key);

  return new Promise<ClientConnection>((resolve, reject) => {
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
          resolve({
            send(data: string) {
              peer.send(data);
            },
            onData(listener: (data: string) => void) {
              peer.on('data', listener);
            }
          });
          console.log('CONNECT')
          peer.send('whatever' + Math.random())
        }
      })
      .on('error', err => {
        state = 'error';
        reject(err);
      })
      .on('data', data => {
        console.log('data: ' + data)
      });
  });
}