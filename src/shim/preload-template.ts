// This module should *only* be loaded as a `--require` script.

declare const context: any;
/* global context */

/* shim-template-include: context */

function register() {
  const spawnWrap: any = require(context.module);
  spawnWrap.applyContextOnGlobal(context);
}

register();
