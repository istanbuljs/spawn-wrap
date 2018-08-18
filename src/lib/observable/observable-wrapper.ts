import assert from "assert";
import * as spawnWrap from "../index";
import { SpawnClient } from "./client";
import { ProxySpawnMessage, ServerMessage, VoidSpawnMessage } from "./protocol";

// This file should not be executed directly: it must be spawn

async function proxySpawn(client: SpawnClient, msg: ProxySpawnMessage) {
  client.close();
  process.argv.splice(4, process.argv.length - 4, ...msg.args);
  spawnWrap.runMain();
}

async function voidSpawn(client: SpawnClient, msg: VoidSpawnMessage) {
  client.close();
  process.argv.splice(4, process.argv.length - 4, ...msg.args);
  spawnWrap.runMain();
}

async function main() {
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
        proxySpawn(client, msg);
        break;
      case "void-spawn":
        voidSpawn(client, msg);
        break;
      default:
        throw new assert.AssertionError({message: "Unreachable"});
    }
  });
}

main();
