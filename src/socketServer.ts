import { Server, Socket } from "socket.io";

export default function socketServer(server: Server) {
  // connect
  // host or client
  // host:
  // genrate key, give to host
  // wait for clients
  //
  // client:
  // wait for key, send id to host
  // wait for response from host
  // send response to client
  // wait for answer from client
  // send answer to host

  const hosts = new Map<string, Socket>();

  server.on('connection', (socket) => {

    console.log('new connection');

    socket.on('host', () => {
      const key = generateKey();

      console.log('host connected', key);

      hosts.set(key, socket);
      socket.on('disconnect', () => hosts.delete(key));
      socket.emit('key', key);
    });

    socket.on('client', (key) => {
      console.log('client connected', key);

      const host = hosts.get(key);

      if (!host) {
        socket.emit('error', 'Unknown game');
        return;
      }

      host.emit('client', socket.id);
    });

    socket.on('signalToClient', (clientId, data) => {
      server.to(clientId).emit('signal', data);
    });
  });

}


export function generateKey() {
  return String.fromCharCode(...[65, 65, 65, 65].map(c => c + Math.floor(Math.random() * 26)));
}