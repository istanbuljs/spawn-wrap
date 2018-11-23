import assert from "assert";
import cp, { ChildProcess } from "child_process";
import events from "events";
import { Observable, Observer, Subscribable, Unsubscribable } from "rxjs";
import { filter } from "rxjs/operators";
import { Api, withSpawnWrap, WithSwOptions } from "../local";
import { SwOptions } from "../types";
import { ClientMessage, InfoMessage, StreamEvent } from "./protocol";
import { RemoteSpawnClient, SpawnServer } from "./server";

const OBSERVABLE_WRAPPER = require.resolve("./observable.wrapper.js");

export class SpawnEvent {
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

    const spawnId: string = this.spawnCount.toString(10);
    this.client.next({
      action: "proxy-spawn",
      spawnId,
      args,
    });
    this.spawnCount++;
    return new SimpleChildProcessProxy(this.client, spawnId);
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

export interface ReadableStreamProxy {
  // tslint:disable:unified-signatures

  /**
   * Event emitter
   * The defined events on documents including:
   * 1. close
   * 2. data
   * 3. end
   * 4. readable
   * 5. error
   */
  addListener(event: "close", listener: () => void): this;

  addListener(event: "data", listener: (chunk: any) => void): this;

  addListener(event: "end", listener: () => void): this;

  addListener(event: "readable", listener: () => void): this;

  addListener(event: "error", listener: (err: Error) => void): this;

  addListener(event: string | symbol, listener: (...args: any[]) => void): this;

  emit(event: "close"): boolean;

  emit(event: "data", chunk: any): boolean;

  emit(event: "end"): boolean;

  emit(event: "readable"): boolean;

  emit(event: "error", err: Error): boolean;

  emit(event: string | symbol, ...args: any[]): boolean;

  on(event: "close", listener: () => void): this;

  on(event: "data", listener: (chunk: any) => void): this;

  on(event: "end", listener: () => void): this;

  on(event: "readable", listener: () => void): this;

  on(event: "error", listener: (err: Error) => void): this;

  on(event: string | symbol, listener: (...args: any[]) => void): this;

  once(event: "close", listener: () => void): this;

  once(event: "data", listener: (chunk: any) => void): this;

  once(event: "end", listener: () => void): this;

  once(event: "readable", listener: () => void): this;

  once(event: "error", listener: (err: Error) => void): this;

  once(event: string | symbol, listener: (...args: any[]) => void): this;

  prependListener(event: "close", listener: () => void): this;

  prependListener(event: "data", listener: (chunk: any) => void): this;

  prependListener(event: "end", listener: () => void): this;

  prependListener(event: "readable", listener: () => void): this;

  prependListener(event: "error", listener: (err: Error) => void): this;

  prependListener(event: string | symbol, listener: (...args: any[]) => void): this;

  prependOnceListener(event: "close", listener: () => void): this;

  prependOnceListener(event: "data", listener: (chunk: any) => void): this;

  prependOnceListener(event: "end", listener: () => void): this;

  prependOnceListener(event: "readable", listener: () => void): this;

  prependOnceListener(event: "error", listener: (err: Error) => void): this;

  prependOnceListener(event: string | symbol, listener: (...args: any[]) => void): this;

  removeListener(event: "close", listener: () => void): this;

  removeListener(event: "data", listener: (chunk: any) => void): this;

  removeListener(event: "end", listener: () => void): this;

  removeListener(event: "readable", listener: () => void): this;

  removeListener(event: "error", listener: (err: Error) => void): this;

  removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
}

export interface ChildProcessProxy {
  readonly stdout: ReadableStreamProxy;
  readonly stderr: ReadableStreamProxy;
}

class SimpleChildProcessProxy implements ChildProcessProxy {
  public readonly stdout: events.EventEmitter;
  public readonly stderr: events.EventEmitter;

  private readonly client: RemoteSpawnClient;
  private readonly spawnId: string;

  constructor(client: RemoteSpawnClient, spawnId: string) {
    this.client = client;
    this.spawnId = spawnId;
    this.stdout = new events.EventEmitter();
    this.stderr = new events.EventEmitter();
    // client
    toObservable(client)
      .pipe<ClientMessage>(
        filter((msg: ClientMessage): boolean => msg.action === "stream-event" && msg.spawnId === spawnId) as any,
      )
      .subscribe((msg: ClientMessage) => {
        switch (msg.action) {
          case "stream-event":
            this.onStreamEvent(msg);
            break;
          default:
            throw new Error(`UnexpectedClientMessage: ${JSON.stringify(msg)}`);
        }
      });
  }

  private onStreamEvent(msg: StreamEvent): void {
    let stream: events.EventEmitter;
    switch (msg.stream) {
      case "stdout":
        stream = this.stdout;
        break;
      case "stderr":
        stream = this.stderr;
        break;
      default:
        throw new Error(`UnexpectedStream: ${JSON.stringify(msg)}`);
    }
    switch (msg.event) {
      case "data":
        stream.emit("data", Buffer.from(msg.chunk, "hex"));
        break;
      case "error":
        stream.emit("error", Object.assign(new Error(), msg.error));
        break;
      case "close":
      case "end":
      case "readable":
        stream.emit(msg.event);
        break;
      default:
        throw new Error(`UnexpectedEvent: ${JSON.stringify(msg)}`);
    }
  }
}

/**
 * Spawn options, with custom `spawn` function.
 */
interface SpawnOptions extends cp.SpawnOptions {
  /**
   * Spawn function to use.
   *
   * You can supply your own spawn function.
   * For example, you can use `cross-spawn` or a `spawn-wrap` function.
   *
   * Default: `require("child_process").spawn`
   */
  spawn?: typeof cp.spawn;
}

export function spawn(
  file: string,
  args?: ReadonlyArray<string>,
  options?: SpawnOptions,
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

      const api: Api | undefined = options !== undefined && options.spawn !== undefined ? {spawn: options.spawn} : undefined;

      const swOptions: WithSwOptions = {
        wrapper: OBSERVABLE_WRAPPER,
        data: {
          host: server.host,
          port: server.port,
        },
        sameProcess: false,
        api,
      };

      withSpawnWrap(swOptions, async (api) => {
        return new Promise((resolve, reject) => {
          rootProcess = api.spawn(file, args, options);
          // rootProcess.stdout.pipe(process.stdout);
          // rootProcess.stderr.pipe(process.stderr);
          server.subscribe(undefined, (err: Error) => reject(err), () => resolve());
          rootProcess.on("close", async () => {
            await server.close();
            observer.complete();
          });
        });
      });
    })();
  });
}

function toObservable<T>(subscribable: Subscribable<T>): Observable<T> {
  return new Observable((subscriber: any) => subscribable.subscribe(subscriber));
}
