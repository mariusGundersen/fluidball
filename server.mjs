import bodyParser from 'body-parser';
import express from 'express';

const app = express()
const port = 8081

const offers = new Map();
const answers = new Map();

app.use(express.static('public'));

app.use(bodyParser.json());

app.post('/api/createGame', (req, res) => {
  const key = generateKey();
  console.log(JSON.stringify(req.body));
  offers.set(key, req.body);
  res.json({ key });
})

app.get('/api/waitForClient', async (req, res) => {
  const key = req.query['key'];
  try {
    const answer = await new Promise(res => answers.set(key, res));
    res.json(answer);
  } finally {
    offers.delete(key);
    answers.delete(key);
  }
})

app.post('/api/answer', (req, res) => {
  const key = req.query['key'];
  console.log(JSON.stringify(req.body));
  answers.get(key)(req.body);
  res.json({ key });
})

app.get('/api/connect', (req, res) => {
  res.json(offers.get(req.query['key']));
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

function generateKey() {
  return String.fromCharCode(...[65, 65, 65, 65].map(c => c + Math.floor(Math.random() * 26)));
}