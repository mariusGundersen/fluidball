import SimplePeer from 'simple-peer';
import { io } from 'socket.io-client';

export default function host() {
  const peers = new Map<string, SimplePeer.Instance>()
  const socket = io();

  socket.emit('host');
  socket.on('key', (key) => {
    document.body.innerHTML = `<a href="/client.html?key=${key}">Join game</a>`;
  });

  socket.on('client', id => {
    console.log('client connnected', id);
    const peer = new SimplePeer({
      initiator: true,
      objectMode: true,
      trickle: false
    });

    peers.set(id, peer);

    peer.on('signal', data => socket.emit('signalToClient', id, data));

    peer.on('connect', () => {
      console.log('CONNECT')
      peer.send('whatever' + Math.random())
    })

    peer.on('data', data => {
      console.log('data: ' + data)
    })
  });

  socket.on('signal', (id, signal) => {
    const peer = peers.get(id);

    if (!peer) {
      console.error('signal to peer that does not exist');
      return;
    }

    peer.signal(signal);
  });

}