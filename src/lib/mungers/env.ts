import { SwContext } from "../context";
import { IS_DEBUG } from "../debug";
import { isPathEnvName, prependPathEnv } from "../path-env-var";
import { NormalizedOptions } from "../types";

export function mungeEnv(ctx: SwContext, options: NormalizedOptions): NormalizedOptions {
  const newEnv: Map<string, string> = new Map();
  let hasPathEnv = false;
  for (const [name, value] of options.env) {
    newEnv.set(name, value);
    if (isPathEnvName(name)) {
      newEnv.set(name, prependPathEnv(value, ctx.shimDir));
      hasPathEnv = true;
    }
  }
  if (!hasPathEnv) {
    newEnv.set("PATH", ctx.shimDir);
  }
  if (IS_DEBUG) {
    newEnv.set("SPAWN_WRAP_DEBUG", "1");
  }

  return {...options, env: newEnv};
}
