import nipplejs from "nipplejs";
import React, { useEffect, useRef } from "react";
import Div100vh from "react-div-100vh";
import { ClientConnection } from "../types";
import style from "./client.module.css";

export interface GamePadProps {
  readonly connection: ClientConnection;
  readonly color: "red" | "blue";
}

export default function GamePad({ color, connection }: GamePadProps) {
  const leftPad = useRef<HTMLDivElement>(null);
  const rightPad = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let move: { x: number; y: number } = { x: 0, y: 0 };
    let aim: { x: number; y: number } | null = null;

    const leftJoystick = nipplejs.create({
      color,
      zone: leftPad.current!,
    });

    leftJoystick.on("move", (_, data) => {
      move = data.vector;
    });

    leftJoystick.on("end", (_) => {
      move = { x: 0, y: 0 };
    });

    const rightJoystick = nipplejs.create({
      color,
      zone: rightPad.current!,
    });

    rightJoystick.on("move", (_, data) => {
      aim = data.vector;
    });

    rightJoystick.on("end", () => {
      aim = null;
    });

    let sendTimes: number[] = [];
    let ping = 16;
    let active = true;
    setTimeout(send, ping);

    const stopMoveAck = connection.on("move_ack", () => {
      const sentAt = sendTimes.shift();
      if (sentAt !== undefined) {
        ping = (window.performance.now() - sentAt) / 2;
      }
    });

    function send() {
      sendTimes.push(window.performance.now());
      connection.send("move", move, aim);

      if (active) {
        setTimeout(send, ping);
      }
    }

    () => {
      leftJoystick.destroy();
      rightJoystick.destroy();
      active = false;
      stopMoveAck();
    };
  }, []);

  return (
    <Div100vh className={style.gamepad}>
      <div className={style.rotate}>
        <svg viewBox="0 0 27.442 27.442" width="27" height="27">
          <path
            d="M19.494,0H7.948C6.843,0,5.951,0.896,5.951,1.999v23.446c0,1.102,0.892,1.997,1.997,1.997h11.546
		c1.103,0,1.997-0.895,1.997-1.997V1.999C21.491,0.896,20.597,0,19.494,0z M10.872,1.214h5.7c0.144,0,0.261,0.215,0.261,0.481
		s-0.117,0.482-0.261,0.482h-5.7c-0.145,0-0.26-0.216-0.26-0.482C10.612,1.429,10.727,1.214,10.872,1.214z M13.722,25.469
		c-0.703,0-1.275-0.572-1.275-1.276s0.572-1.274,1.275-1.274c0.701,0,1.273,0.57,1.273,1.274S14.423,25.469,13.722,25.469z
		 M19.995,21.1H7.448V3.373h12.547V21.1z"
            fill="white"
          />
        </svg>
      </div>
      <div ref={leftPad}></div>
      <div ref={rightPad}></div>
    </Div100vh>
  );
}
