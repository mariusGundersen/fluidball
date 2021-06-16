import host from "./hostListener";

host().then(({ key, onClient }) => {
  document.body.innerHTML = `<a href="/client.html?key=${key}">Join game</a>`;
  onClient(peer => {
    peer.onData(data => {
      console.log(data);
      if (data.type === 'ping') {
        peer.send({
          type: 'pong'
        });
      }
    });

    peer.send({
      type: 'greeting',
      message: 'host says hi'
    });

    peer.onDisconnect(() => {
      console.log('disconnected');
    });
  })
});