import bodyParser from 'body-parser';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import socketServer, { generateKey } from './socketServer';

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

//let playerCounter = 0;

const socketIo = new Server(server)
  /*.on('connection', (socket) => {
    const player = (playerCounter++) % 2;

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
    });
  })*/;

socketServer(socketIo);

server
  .listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  });
