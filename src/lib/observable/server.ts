import assert from "assert";
import net from "net";
import { Observable, Observer, Subject, Subscribable } from "rxjs";
import { rxToStream, streamToRx } from "rxjs-stream";
import { parseJsonLines, printJsonLines } from "./json-lines";
import { ClientMessage, ServerMessage } from "./protocol";

export class SpawnServer implements Subscribable<RemoteSpawnClient> {
  public static async create(): Promise<SpawnServer> {
    const tcpServer: TcpServer = await TcpServer.create();
    return new SpawnServer(tcpServer);
  }

  public readonly host: string;
  public readonly port: number;
  private readonly clients: Subject<RemoteSpawnClient>;
  private readonly tcpServer: TcpServer;

  private constructor(tcpServer: TcpServer) {
    this.host = tcpServer.host;
    this.port = tcpServer.port;
    this.clients = new Subject();
    this.tcpServer = tcpServer;

    tcpServer.connections.subscribe(
      (socket: net.Socket) => {
        const remoteClient = new RemoteSpawnClient(socket);
        this.clients.next(remoteClient);
      },
      this.clients.error.bind(this.clients),
      this.clients.complete.bind(this.clients),
    );
  }

  public close() {
    this.tcpServer.close();
  }

  public subscribe(...args: any[]): any {
    return this.clients.subscribe(...args);
  }
}

export class TcpServer {
  public static async create(): Promise<TcpServer> {
    return new Promise<TcpServer>((resolve, reject) => {
      const server: net.Server = net.createServer();
      server.on("error", onError);
      server.on("listening", onListening);
      server.listen();

      function onError(err: Error) {
        removeListeners();
        reject(err);
      }

      function onListening() {
        removeListeners();
        resolve(new TcpServer(server));
      }

      function removeListeners() {
        server.removeListener("error", onError);
        server.removeListener("listening", onListening);
      }
    });
  }

  public readonly host: string;
  public readonly port: number;
  public readonly connections: Observable<net.Socket>;
  private readonly server: net.Server;

  private constructor(server: net.Server) {
    const addressInfo: net.AddressInfo | string = server.address();
    if (typeof addressInfo !== "object") {
      throw new assert.AssertionError({message: "Expected `addressInfo` to be an object.", actual: addressInfo});
    }
    this.host = addressInfo.address;
    this.port = addressInfo.port;

    const connections: Subject<net.Socket> = new Subject();
    server.on("connection", (socket) => connections.next(socket));
    this.connections = connections;
    this.server = server;
  }

  public close() {
    this.server.close();
    (this.connections as Subject<net.Socket>).complete();
  }
}

/**
 * Represents a remote `SpawnClient`.
 */
export class RemoteSpawnClient implements Observer<ServerMessage>, Subscribable<ClientMessage> {
  public readonly input: Observable<ClientMessage>;
  public readonly output: Observer<ServerMessage>;

  constructor(socket: net.Socket) {
    this.input = streamToRx(socket).pipe(parseJsonLines());
    const output: Subject<ServerMessage> = new Subject();
    rxToStream(output.pipe(printJsonLines())).pipe(socket);
    this.output = output;
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

  public next(value: ServerMessage): void {
    return this.output.next(value);
  }

  public subscribe(...args: any[]): any {
    return this.input.subscribe(...args);
  }
}
