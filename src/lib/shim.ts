import fs from "fs";
import path from "path";
import { SwContext } from "./context";

const SHIM_TEMPLATE_PATH = path.join(__dirname, "templates", "shim-template.js");
const SHIM_TEMPLATE = fs.readFileSync(SHIM_TEMPLATE_PATH, "utf8");
const PRELOAD_TEMPLATE_PATH = path.join(__dirname, "templates", "preload-template.js");
const PRELOAD_TEMPLATE = fs.readFileSync(PRELOAD_TEMPLATE_PATH, "utf8");

function getShebang(execPath: string): string {
  // TODO: Remove the conditional? `os390` seems to be invalid
  const prefix = (process.platform as string) === "os390" ? "#!/bin/env " : "#!";
  return `${prefix}${execPath}\n`;
}

export function getShim(ctx: SwContext) {
  const shebangLine = getShebang(ctx.root.execPath);
  const contextJson = JSON.stringify(ctx);
  const contextLines = `const context = ${contextJson};\n`;
  const shimBody = SHIM_TEMPLATE.replace("/* shim-template-include: context */\n", contextLines);
  return `${shebangLine}${shimBody}`;
}

export function getPreload(ctx: SwContext) {
  const contextJson = JSON.stringify(ctx);
  const contextLines = `const context = ${contextJson};\n`;
  return PRELOAD_TEMPLATE.replace("/* shim-template-include: context */\n", contextLines);
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
