import assert from "assert";
import cp, { ChildProcess } from "child_process";
import { Observable, Observer, Subscribable, Unsubscribable } from "rxjs";
import { withSpawnWrap } from "../local";
import { ClientMessage, InfoMessage } from "./protocol";
import { RemoteSpawnClient, SpawnServer } from "./server";

const OBSERVABLE_WRAPPER = require.resolve("./observable-wrapper.js");

class SpawnEvent {
  public readonly args: ReadonlyArray<string>;
  public readonly rootProcess: ChildProcess | undefined;
  private readonly client: RemoteSpawnClient;
  private spawnCount: number;

  constructor(client: RemoteSpawnClient, info: InfoMessage, rootProcess?: ChildProcess) {
    this.args = Object.freeze([...info.args]);
    this.client = client;
    this.spawnCount = 0;
    this.rootProcess = rootProcess;
  }

  public proxySpawn(args?: ReadonlyArray<string>): ChildProcessProxy {
    if (this.spawnCount > 0) {
      throw new Error("Cannot spawn remote process multiple times");
    }
    if (args === undefined) {
      args = this.args;
    }

    const spawnId: number = this.spawnCount;
    this.client.next({
      action: "proxy-spawn",
      spawnId,
      args,
    });
    this.spawnCount++;
    return new ChildProcessProxy(this.client, spawnId);
  }

  public voidSpawn(args?: ReadonlyArray<string>): void {
    if (this.spawnCount > 0) {
      throw new Error("Cannot spawn remote process multiple times");
    }
    if (args === undefined) {
      args = this.args;
    }

    this.client.next({
      action: "void-spawn",
      args,
    });
    this.spawnCount++;
  }
}

export class ChildProcessProxy {
  private readonly file: string;
  private readonly client: RemoteSpawnClient;
  private readonly spawnId: number;

  constructor(client: RemoteSpawnClient, spawnId: number) {
    this.file = "TODO";
    this.client = client;
    this.spawnId = spawnId;
  }
}

export function spawn(
  file: string,
  args?: ReadonlyArray<string>,
  options?: cp.SpawnOptions,
): Subscribable<SpawnEvent> {
  return new Observable((observer: Observer<SpawnEvent>) => {
    (async () => {
      let rootProcess: ChildProcess;
      let first: boolean = true;
      const server = await SpawnServer.create();
      server.subscribe((client: RemoteSpawnClient) => {
        const subscription: Unsubscribable = client.subscribe((msg: ClientMessage) => {
          if (msg.action !== "info") {
            observer.error(new Error("Expected first message to be `info`"));
          } else {
            if (first) {
              first = false;
              assert(rootProcess !== undefined);
              observer.next(new SpawnEvent(client, msg, rootProcess));
            } else {
              observer.next(new SpawnEvent(client, msg));
            }
            subscription.unsubscribe();
          }
        });
      });

      const wrapperArgs: string[] = [OBSERVABLE_WRAPPER, server.host, server.port.toString(10)];

      withSpawnWrap({args: wrapperArgs}, async (api) => {
        return new Promise((resolve, reject) => {
          rootProcess = api.spawn(file, args, options);
          server.subscribe(undefined, (err: Error) => reject(err), () => resolve());
          rootProcess.on("close", () => {
            server.close();
            observer.complete();
          });
        });
      });
    })();
  });
}
