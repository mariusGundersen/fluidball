import clientConnection from "./clientConnection";

const query = new URLSearchParams(document.location.search);

clientConnection(query.get('key') ?? 'ABCD').then(client => {
  client.onData(data => {
    if (data.type === 'pong') {
      console.timeEnd('ping');
      setTimeout(sendPing, 1000);
    }
    console.log('data', data);
  });
  client.send({
    type: 'greeting',
    message: 'host says hi'
  });
  function sendPing() {
    client.send({
      type: 'ping'
    });
    console.time('ping');
  }

  sendPing();
});