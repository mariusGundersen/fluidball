import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import GameHost from "./GameHost";
import host, { Result } from "./hostListener";

ReactDOM.render(<Host />, document.body);

function Host() {
  const [props, setProps] = useState<Result>();

  useEffect(() => {
    host().then(setProps);
  }, []);

  return props ? (
    <GameHost gameKey={props.key} onClient={props.onClient} />
  ) : (
    <span>Loading...</span>
  );
}
