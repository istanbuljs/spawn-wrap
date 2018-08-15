import fs from "fs";
import path from "path";
import { SwContext } from "../context";
import { isNode } from "../exe-type";
import { InternalSpawnOptions } from "../types";
import { whichOrUndefined } from "../which-or-undefined";

export function mungeShebang(ctx: SwContext, options: InternalSpawnOptions): InternalSpawnOptions {
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
  const maybeNode = path.basename(shebangExe);
  if (!isNode(maybeNode)) {
    // not a node shebang, leave untouched
    return options;
  }

  // options.originalNode = shebangExe;
  // options.basename = maybeNode;
  const newFile: string = shebangExe;
  const nodeShim: string = path.join(ctx.shimDir, "node");
  const newArgs = [shebangExe, nodeShim]
    .concat(resolved)
    .concat(match[1].split(" ").slice(1))
    .concat(options.args.slice(1));

  return {...options, file: newFile, args: newArgs};
}
