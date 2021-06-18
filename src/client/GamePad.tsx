import nipplejs from "nipplejs";
import React, { useEffect, useRef } from "react";
import Div100vh from "react-div-100vh";
import style from "./client.module.css";
import { ClientConnection } from "../types";

export interface GamePadProps {
  readonly connection: ClientConnection;
  readonly color: "red" | "blue";
}

export default function GamePad({ color, connection }: GamePadProps) {
  const leftPad = useRef<HTMLDivElement>(null);
  const rightPad = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const leftJoystick = nipplejs.create({
      color,
      zone: leftPad.current!,
    });

    leftJoystick.on("move", (e, data) => {
      connection.send("move", data.vector);
      console.log(e.target.id, data.vector);
    });

    leftJoystick.on("end", (e) => {
      connection.send("move", { x: 0, y: 0 });
      console.log(e.target.id, { x: 0, y: 0 });
    });

    const rightJoystick = nipplejs.create({
      color,
      zone: rightPad.current!,
    });

    rightJoystick.on("move", (e, data) => {
      console.log(data);
      connection.send("aim", {
        x: data.vector.x,
        y: data.vector.y,
      });
    });

    rightJoystick.on("end", (e) => {
      connection.send("kick");
    });
  }, []);

  return (
    <Div100vh className={style.gamepad}>
      <div ref={leftPad}></div>
      <div ref={rightPad}></div>
    </Div100vh>
  );
}
