import assert from "assert";
import { SwContext } from "../context";
import { SpawnClient } from "./client";
import { ProxySpawnMessage, ServerMessage, VoidSpawnMessage } from "./protocol";

// This file should not be executed directly: it must be spawn

async function proxySpawn(ctx: SwContext, client: SpawnClient, msg: ProxySpawnMessage) {
  client.close();
  const node: string = process.execPath;
  const foregroundChild = require(ctx.deps.foregroundChild);
  foregroundChild(node, ["--require", ctx.preloadScript, ...msg.args]);
}

async function voidSpawn(ctx: SwContext, client: SpawnClient, msg: VoidSpawnMessage) {
  client.close();
  const node: string = process.execPath;
  const foregroundChild = require(ctx.deps.foregroundChild);
  foregroundChild(node, ["--require", ctx.preloadScript, ...msg.args]);
}

async function main(ctx: SwContext) {
  assert(process.argv.length >= 4);
  const host: string = process.argv[2];
  const port: number = parseInt(process.argv[3], 10);

  const client = await SpawnClient.create(host, port);

  const wrappedArgs: string[] = process.argv.slice(4);
  client.next({
    action: "info",
    pid: process.pid,
    args: wrappedArgs,
    env: {},
  });

  client.subscribe((msg: ServerMessage) => {
    switch (msg.action) {
      case "proxy-spawn":
        proxySpawn(ctx, client, msg);
        break;
      case "void-spawn":
        voidSpawn(ctx, client, msg);
        break;
      default:
        throw new assert.AssertionError({message: "Unreachable"});
    }
  });
}

export default main;
