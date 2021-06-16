import clientConnection from "./clientConnection";

const query = new URLSearchParams(document.location.search);

clientConnection(query.get('key') ?? 'ABCD').then(client => {
  client.onData(data => console.log('data', data));
  client.send('Testing')
});