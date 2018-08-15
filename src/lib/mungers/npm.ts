import path from "path";
import { SwContext } from "../context";
import { debug } from "../debug";
import { InternalSpawnOptions } from "../types";
import { whichOrUndefined } from "../which-or-undefined";

export function mungeNpm(ctx: SwContext, options: Readonly<InternalSpawnOptions>): InternalSpawnOptions {
  debug("munge npm");
  // XXX weird effects of replacing a specific npm with a global one
  const npmPath = whichOrUndefined("npm");

  if (npmPath === undefined) {
    return options;
  }
  const nodeShim = path.join(ctx.shimDir, "node");
  const newArgs: string[] = [nodeShim, npmPath].concat(options.args.slice(1));
  return {...options, file: nodeShim, args: newArgs};
}
