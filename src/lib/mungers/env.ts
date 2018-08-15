import isWindows from "is-windows";
import { SwContext } from "../context";
import { IS_DEBUG } from "../debug";
import { InternalSpawnOptions } from "../types";

const PATH_ENV_RE = new RegExp("^(PATH)=([\\S\\s]*)", isWindows() ? "i" : "");
const colon = isWindows() ? ";" : ":";

export function mungeEnv(ctx: SwContext, options: Readonly<InternalSpawnOptions>): InternalSpawnOptions {
  const newEnvPairs: string[] = [...options.envPairs];
  let hasPathEnv: boolean = false;
  // TODO: use .map
  for (let i = 0; i < options.envPairs.length; i++) {
    const match = PATH_ENV_RE.exec(options.envPairs[i]);
    if (match !== null) {
      hasPathEnv = true;
      const name: string = match[1];
      const value: string = match[2];
      const newValue: string = `${ctx.shimDir}${colon}${value}`;
      newEnvPairs[i] = `${name}=${newValue}`;
    }
  }
  if (!hasPathEnv) {
    newEnvPairs.push(`PATH=${ctx.shimDir}`);
  }
  // if (options.originalNode) {
  //   const key = path.basename(workingDir);
  //   options.envPairs.push("SW_ORIG_" + key + "=" + options.originalNode);
  // }

  // options.envPairs.push('SPAWN_WRAP_SHIM_ROOT=' + homedir)

  if (IS_DEBUG) {
    newEnvPairs.push("SPAWN_WRAP_DEBUG=1");
  }

  return {...options, envPairs: newEnvPairs};
}
