import EventEmitter from "events";
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
  private readonly eventEmitter: EventEmitter;
  constructor(peer: Instance) {
    this.peer = peer;
    this.eventEmitter = new EventEmitter();
    this.peer.on('data', json => {
      const data = JSON.parse(json);
      return this.eventEmitter.emit(data.type, ...data.data);
    });
  }

  send<E extends EventNames<Send>>(type: E, ...data: EventParams<Send, E>) {
    this.peer.send(JSON.stringify({ type, data }));
  }

  on<E extends EventNames<Receive>>(event: E, listener: (...data: EventParams<Receive, E>) => void) {
    this.eventEmitter.on(event, listener as any);
    return () => this.eventEmitter.off(event, listener as any);
  }

  once<E extends EventNames<Receive>>(event: E): Promise<EventParams<Receive, E>[0]> {
    return new Promise(res => this.eventEmitter.once(event, res));
  }

  onDisconnect(listener: (message?: string) => void) {
    this.peer.on('close', listener);
    this.peer.on('error', e => listener(e.message));
  }
}
