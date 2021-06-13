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
  .createServer(app)

const socketIo = new Server(server)
  .on('connection', (socket) => {
    console.log('client connected');
    socket.on('move', vector => {
      socket.broadcast.emit('move', vector);
    });
    socket.on('aim', vector => {
      socket.broadcast.emit('aim', vector);
    });
    socket.on('kick', () => {
      socket.broadcast.emit('kick');
    });
  });

server
  .listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  });

function generateKey() {
  return String.fromCharCode(...[65, 65, 65, 65].map(c => c + Math.floor(Math.random() * 26)));
}