import SimplePeer, { Instance } from "simple-peer";

export interface Data {
  type: string
}

/**
 * An events map is an interface that maps event names to their value, which
 * represents the type of the `on` listener.
 */
export interface EventsMap {
  [event: string]: any;
}
export interface DefaultEventsMap {
  [event: string]: (p: any) => void;
}
export type EventNames<Map extends EventsMap> = keyof Map & string;
export type EventParams<Map extends EventsMap, Ev extends EventNames<Map>> = Parameters<Map[Ev]>;
export type EventObject<Map extends EventsMap, Type extends string> = {
  type: Type,
  data: EventParams<Map, Type>
}


export class PeerConnection<Send extends EventsMap = DefaultEventsMap, Receive extends EventsMap = DefaultEventsMap> {
  private readonly peer: SimplePeer.Instance;
  constructor(peer: Instance) {
    this.peer = peer;
  }
  send<E extends EventNames<Send>>(type: E, ...data: EventParams<Send, E>) {
    this.peer.send(JSON.stringify({ type, data }));
  }

  onData<T extends EventNames<Receive>>(listener: (data: EventObject<Receive, T>) => void) {
    this.peer.on('data', data => listener(JSON.parse(data)));
  }

  on<E extends EventNames<Receive>>(event: E, listener: (...data: EventParams<Receive, E>) => void) {
    this.onData<E>(data => data.type === event && listener(...data.data));
  }
  onDisconnect(listener: () => void) {
    this.peer.on('close', listener);
    this.peer.on('error', listener);
  }
}
