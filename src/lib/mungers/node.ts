import { SwContext } from "../context";
import { debug } from "../debug";
import { getExeBasename } from "../exe-type";
import { NormalizedOptions } from "../types";
import { whichOrUndefined } from "../which-or-undefined";

export function mungeNode(ctx: SwContext, options: NormalizedOptions): NormalizedOptions {
  const cmdBasename: string = getExeBasename(options.file);
  // make sure it has a main script.
  // otherwise, just let it through.
  let a = 0;
  // tslint:disable-next-line:no-unnecessary-initializer
  let mainIndex: number | undefined = undefined;
  for (a = 1; mainIndex === undefined && a < options.args.length; a++) {
    switch (options.args[a]) {
      case "-p":
      case "-i":
      case "--interactive":
      case "--eval":
      case "-e":
      case "-pe":
        mainIndex = undefined;
        a = options.args.length;
        continue;

      case "-r":
      case "--require":
        a += 1;
        continue;

      default:
        // TODO: Double-check this part
        if (options.args[a].match(/^-/)) {
          continue;
        } else {
          mainIndex = a;
          a = options.args.length;
          break;
        }
    }
  }

  const newArgs: string[] = [...options.args];
  let newFile: string = options.file;

  if (mainIndex !== undefined) {
    newArgs.splice(mainIndex, 0, ctx.shimScript);
  }

  // If the file is just something like 'node' then that'll
  // resolve to our shim, and so to prevent double-shimming, we need
  // to resolve that here first.
  // This also handles the case where there's not a main file, like
  // `node -e 'program'`, where we want to avoid the shim entirely.
  if (cmdBasename === options.file) {
    const resolvedNode: string | undefined = whichOrUndefined(options.file);
    const realNode = resolvedNode !== undefined ? resolvedNode : process.execPath;
    newArgs[0] = realNode;
    newFile = realNode;
  }

  debug("mungeNode after", newFile, newArgs);

  return {...options, args: newArgs, file: newFile};
}
