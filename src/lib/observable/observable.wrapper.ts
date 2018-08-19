import assert from "assert";
import cp from "child_process";
import stream from "stream";
import { SwContext } from "../context";
import { WrapperApi } from "../types";
import { SpawnClient } from "./client";
import { foregroundChild } from "./foreground-child";
import { ProxySpawnMessage, ServerMessage, VoidSpawnMessage } from "./protocol";

function cpProxy(client: SpawnClient, spawnId: string, proc: cp.ChildProcess): void {
  listen(proc.stdout, "stdout");
  listen(proc.stderr, "stderr");

  function listen(stream: stream.Readable, name: "stdout" | "stderr") {
    const partial = {spawnId, action: "stream-event" as "stream-event", stream: name};

    stream.on("data", (chunk: Buffer): void => {
      client.next({...partial, event: "data", chunk: chunk.toString("hex")});
    });
    stream.on("error", (error: Error): void => {
      client.next({...partial, event: "error", error: JSON.stringify(error)});
    });
    stream.on("close", () => client.next({...partial, event: "close"}));
    stream.on("end", () => client.next({...partial, event: "end"}));
    stream.on("readable", () => client.next({...partial, event: "readable"}));
  }
}

// This file should not be executed directly: it must be spawn

async function proxySpawn(ctx: SwContext, client: SpawnClient, msg: ProxySpawnMessage) {
  const node: string = process.execPath;
  const proc: cp.ChildProcess = foregroundChild(
    node,
    ["--require", ctx.preloadScript, ...msg.args],
    async () => {
      return client.close();
    },
  );
  cpProxy(client, msg.spawnId, proc);
}

async function voidSpawn(ctx: SwContext, client: SpawnClient, msg: VoidSpawnMessage) {
  client.close();
  const node: string = process.execPath;
  const foregroundChild = require(ctx.deps.foregroundChild);
  foregroundChild(node, ["--require", ctx.preloadScript, ...msg.args]);
}

async function main(wrapper: WrapperApi) {
  assert(process.argv.length >= 2);
  const host: string = wrapper.context.data.host;
  const port: number = wrapper.context.data.port;

  const client = await SpawnClient.create(host, port);

  client.next({
    action: "info",
    pid: process.pid,
    args: wrapper.args,
    env: {},
  });

  client.subscribe((msg: ServerMessage) => {
    switch (msg.action) {
      case "proxy-spawn":
        proxySpawn(wrapper.context, client, msg);
        break;
      case "void-spawn":
        voidSpawn(wrapper.context, client, msg);
        break;
      default:
        throw new assert.AssertionError({message: "Unreachable"});
    }
  });
}

export default main;
