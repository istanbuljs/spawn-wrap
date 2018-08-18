import fs from "fs";
import path from "path";
import { SwContext } from "./context";

const SHIM_TEMPLATE_PATH = path.join(__dirname, "..", "..", "build", "shim", "shim-template.js");
const SHIM_TEMPLATE = fs.readFileSync(SHIM_TEMPLATE_PATH, "utf8");

function getShebang(execPath: string): string {
  // TODO: Remove the conditional? `os390` seems to be invalid
  const prefix = (process.platform as string) === "os390" ? "#!/bin/env " : "#!";
  return `${prefix}${execPath}\n`;
}

export function getShim(ctx: SwContext) {
  const shebangLine = getShebang(ctx.root.execPath);
  const contextJson = JSON.stringify(ctx, null, 2);
  const contextLines = `const context = ${contextJson};\n`;
  const shimBody = SHIM_TEMPLATE.replace("/* shim-template-include: context */\n", contextLines);
  return `${shebangLine}${shimBody}`;

}

export function getCmdShim(ctx: SwContext) {
  const execPath = ctx.root.execPath;

  // TODO: Is `execPath` properly escaped?
  const cmdShim =
    "@echo off\r\n" +
    "SETLOCAL\r\n" +
    "SET PATHEXT=%PATHEXT:;.JS;=;%\r\n" +
    "\"" + execPath + "\"" + " \"%~dp0\\.\\node\" %*\r\n";

  return cmdShim;
}
