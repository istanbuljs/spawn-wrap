import { SwContext } from "../context";
import { debug } from "../debug";
import { getExeBasename } from "../exe-type";
import { ParsedNodeOptions, parseNodeOptions } from "../parse-node-options";
import { NormalizedOptions } from "../types";
import { whichOrUndefined } from "../which-or-undefined";

export function mungeNode(ctx: SwContext, options: NormalizedOptions): NormalizedOptions {
  const parsed: ParsedNodeOptions = parseNodeOptions(options.args);

  let newArgs: string[];
  if (ctx.sameProcess) {
    if (parsed.appArgs.length > 0) {
      // Has a script
      newArgs = [parsed.execPath, ...parsed.execArgs, "--", ctx.shimScript, ...parsed.appArgs];
    } else {
      // `--interactive`, `--eval`, `--version`, etc.
      // Avoid wrapping these kind of invocations in same-process mode.
      newArgs = [...options.args];
    }
  } else {
    // In subProcess mode, the exec args are not applied to the wrapper process.
    newArgs = [parsed.execPath, "--", ctx.shimScript,  ...parsed.execArgs, ...parsed.appArgs];
  }

  let newFile: string = options.file;

  // If the file is just something like 'node' then that'll
  // resolve to our shim, and so to prevent double-shimming, we need
  // to resolve that here first.
  // This also handles the case where there's not a main file, like
  // `node -e 'program'`, where we want to avoid the shim entirely.
  if (options.file === getExeBasename(options.file)) {
    const resolvedNode: string | undefined = whichOrUndefined(options.file);
    const realNode = resolvedNode !== undefined ? resolvedNode : process.execPath;
    newArgs[0] = realNode;
    newFile = realNode;
  }

  debug("mungeNode after", newFile, newArgs);

  return {...options, args: newArgs, file: newFile};
}
