// This module should *only* be loaded as a `--require` script.

import { SwContext } from "../context";

declare const context: SwContext;
/* global context */

/* shim-template-include: context */

function register() {
  const spawnWrap: any = require(context.module);
  spawnWrap.patchInternalsWithContext(context);
}

register();
