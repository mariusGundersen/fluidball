import nipplejs from 'nipplejs';
import clientConnection from "./clientConnection";

const query = new URLSearchParams(document.location.search);

export interface ClientToHost {
  ping(): void,
  greeting(message: string): void,
  move(pos: { x: number, y: number }): void
  aim(pos: { x: number, y: number }): void
  kick(): void
}

export interface HostToClient {
  pong(): void,
  team(team: 0 | 1): void
}

clientConnection<ClientToHost, HostToClient>(query.get('key') ?? 'ABCD').then(client => {
  client.on('pong', () => {
    console.timeEnd('ping');
    setTimeout(sendPing, 1000);
  });

  client.send('greeting', 'host says hi');

  function sendPing() {
    client.send('ping');
    console.time('ping');
  }

  sendPing();

  client.on('team', team => {

    const color = team === 0 ? 'red' : 'blue';
    console.log('team', team, color);

    const leftJoystick = nipplejs.create({
      color,
      zone: document.getElementById('left')!,
    });

    leftJoystick.on('move', (e, data) => {
      client.send('move', data.vector);
      console.log(e.target.id, data.vector);
    });

    leftJoystick.on('end', (e) => {
      client.send('move', { x: 0, y: 0 });
      console.log(e.target.id, { x: 0, y: 0 });
    });

    const rightJoystick = nipplejs.create({
      color,
      zone: document.getElementById('right')!,
    });

    rightJoystick.on('move', (e, data) => {
      console.log(data);
      client.send('aim', {
        x: data.vector.x,
        y: data.vector.y
      });
    });

    rightJoystick.on('end', (e) => {
      client.send('kick');
    });
  })
});