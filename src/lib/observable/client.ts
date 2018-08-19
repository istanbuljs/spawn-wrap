import net from "net";
import { Observer, Subject, Subscribable } from "rxjs";
import { rxToStream, streamToRx } from "rxjs-stream";
import { parseJsonLines, printJsonLines } from "./json-lines";
import { ClientMessage, ServerMessage } from "./protocol";

export class SpawnClient implements Observer<ClientMessage>, Subscribable<ServerMessage> {
  public static async create(host: string, port: number): Promise<SpawnClient> {
    return new Promise<SpawnClient>((resolve, reject) => {
      const options: net.TcpNetConnectOpts = {host, port};
      const socket: net.Socket = net.createConnection(options);
      socket.on("error", onError);
      socket.on("connect", onConnect);

      function onError(err: Error) {
        removeListeners();
        reject(err);
      }

      function onConnect() {
        removeListeners();
        resolve(new SpawnClient(socket));
      }

      function removeListeners() {
        socket.removeListener("error", onError);
        socket.removeListener("connect", onConnect);
      }
    });
  }

  private readonly input: Subscribable<ServerMessage>;
  private readonly output: Observer<ClientMessage>;
  private readonly socket: net.Socket;

  constructor(socket: net.Socket) {
    this.input = streamToRx(socket).pipe(parseJsonLines());
    const output: Subject<ClientMessage> = new Subject();
    rxToStream(output.pipe(printJsonLines())).pipe(socket);
    this.output = output;
    this.socket = socket;
  }

  public async close(): Promise<void> {
    this.socket.end();
    this.output.complete();
    const socket: net.Socket = this.socket;

    return new Promise<void>((resolve, reject) => {
      socket.once("close", onClose);
      socket.once("error", onError);

      function onClose(hadError: boolean): void {
        removeListeners();
        resolve();
      }

      function onError(error: Error): void {
        removeListeners();
        reject(error);
      }

      function removeListeners() {
        socket.removeListener("close", onClose);
        socket.removeListener("error", onError);
      }
    });
  }

  public get closed() {
    return this.output.closed;
  }

  public complete(): void {
    return this.output.complete();
  }

  public error(err: any): void {
    return this.output.error(err);
  }

  public next(value: ClientMessage): void {
    return this.output.next(value);
  }

  public subscribe(...args: any[]): any {
    return this.input.subscribe(...args);
  }
}
