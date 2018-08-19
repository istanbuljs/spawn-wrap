export interface ProxySpawnMessage {
  action: "proxy-spawn";
  args: ReadonlyArray<string>;
  spawnId: string;
}

export interface VoidSpawnMessage {
  action: "void-spawn";
  args: ReadonlyArray<string>;
}

export type ServerMessage = ProxySpawnMessage | VoidSpawnMessage;

export interface InfoMessage {
  action: "info";
  pid: number;
  args: ReadonlyArray<string>;
  env: Record<string, string>;
}

export interface ErrorStreamEvent {
  spawnId: string;
  action: "stream-event";
  stream: "stdout" | "stderr";
  event: "error";
  error: any;
}

export interface DataStreamEvent {
  spawnId: string;
  action: "stream-event";
  stream: "stdout" | "stderr";
  event: "data";
  // buffer.toString("hex")
  chunk: string;
}

export interface OtherStreamEvent {
  spawnId: string;
  action: "stream-event";
  stream: "stdout" | "stderr";
  event: "close" | "end" | "readable";
}

export type StreamEvent = DataStreamEvent | ErrorStreamEvent | OtherStreamEvent;
export type ClientMessage = InfoMessage | StreamEvent;
