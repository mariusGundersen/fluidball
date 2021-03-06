import bodyParser from 'body-parser';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const port = 8081

const offers = new Map();
const answers = new Map();


const app = express()
  .use(express.static('public'))
  .use(bodyParser.json())
  .post('/api/createGame', (req, res) => {
    const key = generateKey();
    console.log(JSON.stringify(req.body));
    offers.set(key, req.body);
    res.json({ key });
  })
  .get('/api/waitForClient', async (req, res) => {
    const key = req.query['key'];
    try {
      const answer = await new Promise(res => answers.set(key, res));
      res.json(answer);
    } finally {
      offers.delete(key);
      answers.delete(key);
    }
  })
  .post('/api/answer', (req, res) => {
    const key = req.query['key'];
    console.log(JSON.stringify(req.body));
    answers.get(key)(req.body);
    res.json({ key });
  })
  .get('/api/connect', (req, res) => {
    res.json(offers.get(req.query['key']));
  });

const server = http
  .createServer(app);

let playerCounter = 0;
const hosts = new Map();

const socketIo = new Server(server)
  .on('connection', (socket) => {
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
      console.log('signal to client', clientId);

      socketIo.to(clientId).emit('signal', data);
    });

    socket.on('signalToHost', (key, data) => {
      console.log('signal to host', key);

      const host = hosts.get(key);

      if (!host) {
        socket.emit('error', 'Unknown game');
        return;
      }

      host.emit('signal', socket.id, data);
    });

    /*const player = (playerCounter++) % 2;

    console.log('joined team', player);

    socket.emit('team', player);

    socket.on('move', vector => {
      socket.broadcast.emit('move', player, vector);
    });
    socket.on('aim', vector => {
      socket.broadcast.emit('aim', player, vector);
    });
    socket.on('kick', () => {
      socket.broadcast.emit('kick', player);
    });*/
  });

server
  .listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  });

function generateKey() {
  return String.fromCharCode(...[65, 65, 65, 65].map(c => c + Math.floor(Math.random() * 26)));
}