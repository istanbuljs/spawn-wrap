import { SwContext } from "../context";
import { debug } from "../debug";
import { NormalizedOptions } from "../types";
import { whichOrUndefined } from "../which-or-undefined";

export function mungeNpm(ctx: SwContext, options: NormalizedOptions): NormalizedOptions {
  debug("munge npm");
  // XXX weird effects of replacing a specific npm with a global one
  const npmPath = whichOrUndefined("npm");

  if (npmPath === undefined) {
    return options;
  }
  const newArgs: string[] = [ctx.shimExecutable, npmPath].concat(options.args.slice(1));
  return {...options, file: ctx.shimExecutable, args: newArgs};
}
