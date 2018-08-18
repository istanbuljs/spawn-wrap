import fs from "fs";
import { SwContext } from "../context";
import { getExeBasename, isNode } from "../exe-type";
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

  const shebangExe = match[1].split(" ")[0];
  const maybeNode = getExeBasename(shebangExe);
  if (!isNode(maybeNode)) {
    // not a node shebang, leave untouched
    return options;
  }

  // options.originalNode = shebangExe;
  // options.basename = maybeNode;
  const newFile: string = shebangExe;
  const newArgs = [shebangExe, ctx.shimScript]
    .concat(resolved)
    .concat(match[1].split(" ").slice(1))
    .concat(options.args.slice(1));

  return {...options, file: newFile, args: newArgs};
}
