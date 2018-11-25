import fs from "fs";
import { SwContext } from "../context";
import { getExeBasename, isEnv, isNode } from "../exe-type";
import { NormalizedOptions } from "../types";
import { whichOrUndefined } from "../which-or-undefined";

export function mungeShebang(ctx: SwContext, options: NormalizedOptions): NormalizedOptions {
  const resolved = whichOrUndefined(options.file);
  if (resolved === undefined) {
    return options;
  }

  const shebang = fs.readFileSync(resolved, "utf8");
  const match = shebang.match(/^#!([^\r\n]+)/);
  if (!match) {
    // not a shebang script, probably a binary
    return options;
  }

  const shebangComponents: ReadonlyArray<string> = match[1].split(" ");
  let shebangExe: string;
  let shebangTail: ReadonlyArray<string>;
  // TODO: Handle shebang args, currently `shebangTail` is always an empty array
  switch (shebangComponents.length) {
    case 1: {
      // Try to recognize `#!/usr/bin/node`
      const maybeNode: string = getExeBasename(shebangComponents[0]);
      if (!isNode(maybeNode)) {
        // not a node shebang, leave untouched
        return options;
      }
      shebangExe = shebangComponents[0];
      shebangTail = shebangComponents.slice(1);
      break;
    }
    case 2: {
      // Try to recognize `#!/usr/bin/env node`
      if (!isEnv(getExeBasename(shebangComponents[0]))) {
        return options;
      }
      const maybeNode: string | undefined = whichOrUndefined(shebangComponents[1]);
      if (maybeNode === undefined || !isNode(getExeBasename(maybeNode))) {
        // not a node shebang, leave untouched
        return options;
      }
      shebangExe = maybeNode;
      shebangTail = shebangComponents.slice(2);
      break;
    }
    default:
      return options;
  }

  // options.originalNode = shebangExe;
  // options.basename = maybeNode;
  const newFile: string = shebangExe;
  const newArgs = [shebangExe, "--", ctx.shimScript]
    .concat(resolved)
    .concat(shebangTail)
    .concat(options.args.slice(1));

  return {...options, file: newFile, args: newArgs};
}
