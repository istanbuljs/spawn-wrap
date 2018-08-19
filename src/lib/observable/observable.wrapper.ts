import assert from "assert";
import { SwContext } from "../context";
import { WrapperApi } from "../types";
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
