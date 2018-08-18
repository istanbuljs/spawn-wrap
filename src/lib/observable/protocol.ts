export interface ProxySpawnMessage {
  action: "proxy-spawn";
  args: ReadonlyArray<string>;
  spawnId: number;
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

export type ClientMessage = InfoMessage;
