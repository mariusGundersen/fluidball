import { PeerConnection } from "../PeerConnection";
import { HSVtoRGB } from "./utils";

type PlayerData =
  | {
    type: 'move',
    x: number,
    y: number
  } | {
    type: 'aim',
    x: number,
    y: number
  } | {
    type: 'kick'
  };

export default class Player {
  color: { r: number; g: number; b: number; };
  dy = 0;
  dx = 0;
  aimx = 0;
  aimy = 0;
  active = false;
  charge = 0;
  x: number
  y: number
  constructor(x: number, y: number, hue: number, peer: PeerConnection) {
    this.color = HSVtoRGB(hue, 0.9, 0.9)
    this.x = x;
    this.y = y;

    peer.onData<PlayerData>(data => {
      switch (data.type) {
        case 'move':
          this.dx = data.x * 2;
          this.dy = data.y * 2;
          break;

        case 'aim':
          this.aimx = x;
          this.aimy = y;
          this.active = true;
          break;

        case 'kick':
          this.active = false;
      }
    });
  }
}

/*
socket.on('move', (player: number, { x, y }: { x: number, y: number }) => {
  players[player].dx = x * 2;
  players[player].dy = y * 2;
});

socket.on('aim', (player: number, { x, y }: { x: number, y: number }) => {
  players[player].aimx = x;
  players[player].aimy = y;
  players[player].active = true;
});

socket.on('kick', (player: number) => {
  players[player].active = false;
}) */