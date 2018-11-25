# spawn-wrap

Intercepts all spawned Node.js child processes and calls a user-supplied
wrapper script enabling you to modify arguments or environment variables before
executing the original script.

Any child processes launched by that child process will also be
wrapped in a similar fashion.

This is a bit of a brutal hack, designed primarily to support code
coverage reporting in cases where tests or the system under test are
loaded via child processes rather than via `require()`.

It can also be handy if you want to run your own mock executable
instead of some other thing when child procs call into it.

[![Build Status](https://travis-ci.org/istanbuljs/spawn-wrap.svg)](https://travis-ci.org/istanbuljs/spawn-wrap)

## Usage

```javascript
// main.js
const spawnWrap = require('spawn-wrap')

const wrapper = require.resolve('./wrapper.js')

// spawnWrap.patchInternals(swOptions)
const unwrap = spawnWrap.patchInternals({wrapper, data: {foo: 'bar'}})

// later to undo the wrapping, you can call the returned function
unwrap()
```

```javascript
// wrapper.js
module.exports = function(wrapper) {
  const data = wrapper.context.data;
  process.env.FOO = data.foo;
  wrapper.runMain();
}
```

In this example, the `wrapper.js` will be used as the "wrapper" module,
whenever any Node child process is started, whether via a call to `spawn` or
`exec`, whether node is invoked directly as the command or as the result of a
shebang `#!` lookup.

In `wrapper.js`, you can do whatever instrumentation or environment
manipulation you like.  When you're done, and ready to run the "real" main
module (ie, the one that was spawned in the first place), you can do this:

```javascript
// wrapper.js

module.exports = function(wrapper) {
  // my wrapping manipulations
  setupInstrumentationOrCoverageOrWhatever()
  process.on('exit', function (code) {
    storeCoverageInfoSynchronously()
  })

  // now run the instrumented and covered or whatever codes
  wrapper.runMain()
}
```

## Documentation

### Functions

#### `patchInternals(swOptions: SwOptions): UnwrapFn`

Creates a new context synchronously and patches the `child_process` internals.
Any spawned process from now on will be wrapped.

Returns an "unwrap" function (`() => void`) that restores the state of the
internals before the function was called and cleans the spawn context.

### Interfaces

### `SwOptions`

- `wrapper`: Path to the wrapper module. Normalized with `path.resolve`.
  - Type: `string`
  - Required
- `data`: Any JSON-serializable data that you want to pass to the wrapper
  module. It will be available as `context.data` in the wrapper API.
  - Type: JSON-serializable value
  - Optional, default: `{}`
- `shimRoot`: Path to the directory where shim directories will be created. See
  "How it works" section. Normalized with `path.resolve`.
  - Type: `string`
  - Optional, default: `SPAWN_WRAP_SHIM_ROOT` env variable if defined, otherwise
    `$HOME/.node-spawn-wrap`.
- `sameProcess` controls if the "wrapper" and wrapped "main" will use the same
  process. This changes the way the wrapper is executed: read the
  "wrapper modes" section.
  - Type: `boolean`
  - Optional, default: `true`

### `SwContext`

Represents a `spawn-wrap` context. See "How it works" for the details.

- `data`: User-supplied data (from `options.data`)
- `wrapper`: Absolute path to the wrapper module (from `options.wrapper`).
- `sameProcess`: Boolean indicating if `sameProcess` mode is used
  (from `options.sameProcess`).
- `preloadScript`: Absolute path to a preload script bound to this context,
  importing it will inconditionally patch the internals of `child_process`
  by applying withs context. You can use it as a require hook if you are in
  an unwrapped process and want to wrap a child process
  (`spawn('node', ['--require', preloadScript, 'foo.js'])`.
- Other data about the context, see source code (TODO: document it here).

### `WrapperApi`

- `args`: Arguments for the original main module.
  - In `sameProcess=true` mode, it only contains regular (non-exec) arguments.
    For example, spawning `node --require @babel/register foo.js bar` will
    result in `['foo.js', 'bar']`. It corresponds to `process.argv.slice(2)`.
  - In `sameProcess=false` mode, it contains all the arguments passed to the
    original Node process. For example, spawning
    `node --require @babel/register foo.js bar` will result in
    `['--require', '@babel/register', 'foo.js', 'bar']`.
  - Type: `ReadonlyArray<string>`
- `context`: The `SwContext` object corresponding to this wrapper.
- `runMain`: **ONLY AVAILABLE IN `sameProcess=true` MODE**. Requires the
  original main module and executes as if it was the main module.
  
  - It performs the following steps:
    1. Removes the wrapper path from `process.argv`
       (`process.argv.splice(1, 1)`).
    2. Ensures that the main module is not in the `require` cache. (in case it
       was required by the wrapper)
    3. Calls `Module.runMain` to execute the original main module.
  - Type: `() => void`

### Wrapper module

The wrapper module will be called as the main module whenever a Node process is
spawned. For example spawning `node foo.js` will lead to the execution of the
wrapper as if it was `node wrapper.js foo.js`. The wrapper is always injected
before the regular arguments to Node.

The wrapper should export a wrapper function, either as `module.exports` or its
`default` named export. This function will be called with a `WrapperApi` object
providing context to the wrapper.

### Wrapper modes

The wrappers can be invoked in one of two modes: `sameProcess=true` (default)
or `sameProcess=false`.

Here are the differences:

| `sameProcess=true`                    | `sameProcess=false`                  |
|---------------------------------------|--------------------------------------|
| `wrapper.runMain` available           | `wrapper.runMain` unavailable        |
| `wrapper.args` without exec args      | `wrapper.args` with exec args        |
| Internals patched before wrapper call | No automatic internals patching      |
| Wraps only if main module is found    | Always wrap, even `node -e`          |

## Environment variables

`spawn-wrap` responds to two environment variables, both of which are preserved
through child processes.

`SPAWN_WRAP_DEBUG=1` in the environment will make this module dump a lot of
information to stderr.

`SPAWN_WRAP_SHIM_ROOT` can be set to a path on the filesystem where the shim
files are written. By default this is done in `$HOME/.node-spawn-wrap`, but in
some environments you may wish to point it at some other root. (For example,
if `$HOME` is mounted as read-only in a virtual machine or container.)

## Contracts and caveats

The initial wrap call uses synchronous I/O.  Probably you should not
be using this script in any production environments anyway.

Also, this will slow down child process execution by a lot, since
we're adding a few layers of indirection.

The contract which this library aims to uphold is:

- Wrapped processes behave identical to their unwrapped counterparts
  for all intents and purposes.  That means that the wrapper script
  propagates all signals and exit codes.
- If you send a signal to the wrapper, the child gets the signal.
- If the child exits with a numeric status code, then the wrapper
  exits with that code.
- If the child dies with a signal, then the wrapper dies with the
  same signal.
- If you execute any Node child process, in any of the various ways
  that such a thing can be done, it will be wrapped.
- Children of wrapped processes are also wrapped.

(Much of this made possible by
[foreground-child](http://npm.im/foreground-child).)

There are a few ways situations in which this contract cannot be
adhered to, despite best efforts:

1. In order to handle cases where `node` is invoked in a shell script,
   the `PATH` environment variable is modified such that the the shim
   will be run before the "real" node.  However, since Windows does
   not allow executing shebang scripts like regular programs, a
   `node.cmd` file is required.
2. Signal propagation through `dash` doesn't always work.  So, if you
   use `child_process.exec()` on systems where `/bin/sh` is actually
   `dash`, then the process may exit with a status code > 128 rather
   than indicating that it received a signal.
3. `cmd.exe` is even stranger with how it propagates and interprets
   unix signals.  If you want your programs to be portable, then
   probably you wanna not rely on signals too much.
4. It *is* possible to escape the wrapping, if you spawn a bash
   script, and that script modifies the `PATH`, and then calls a
   specific `node` binary explicitly.

## How it works

When you create a new wrapper, the library starts by creating a context
(SwContext). This is an object storing the user options (wrapper path, wrapper
data, sameProcess mode) and extra data such as a unique key and the absolute
paths to the Node process, `spawn-wrap`, a few dependencies and the shims.

During the creation of the context, a "shim directory" is written (by default,
it is a unique directory inside `~/.node-spawn-wrap`). This directory contains
executables ("shims") that are intended to intercept system calls to spawn
Node processes and instead trigger the wrapping logic.

The shims are auto-generated executables. The context is embedded in them.
Their role is to patch of internals of the current Node process, load the
wrapper and execute them.
One shim is created with the name `node`, and eventually another one with the
same basename as the root process (for example `iojs` if the root process was
named `iojs` instead of `node`). These shims are executable scripts with a
shebang. For Windows, a `.cmd` file is created for each shim: for example
`node.cmd` to open the `node` shim.

Once the context is created and its shim directory written, `spawn-wrap`
patches the API to use the shims.
`spawn-wrap` can either patch the internals of `child_process` or create a
wrapper around a `child_process`-like API. Patching the internals affects
any code spawning processes, while the wrapper solution only intercepts calls
going through the wrapper.
The patch performs 4 steps: normalize the options, rewrite the options,
denormalize the options, call the original function. The
normalization/denormalization converts between API-specific arguments and
a normalized representation of the spawn options. This normalized
representation contains the spawned file, array of arguments and map of
environment variables.

The action of rewriting the spawn options is called "munging" in the lib.
The goal is to replace any invocation of the real Node with one of the shims.
The munging has a file-specific step and a general environment patching step.
The munger will use the name (or try to read the shebang) of the spawned file
to perform application-specific transformations. It currently detects
when you spawn another Node process, `npm`, `cmd` or a known POSIX shell
(`sh`, `bash`, ...).
If you are spawning a shell, it will try to detect if you use the shell to
spawn `node` or `npm`. For `node`, it will insert the shim script just after
the Node executable: `node foo.js` will be replaced by
`node path/to/shim/node foo.js`. For npm it will prefix it with the shim
executable and ensure that he script path is used (Windows-based example
so it's clear what's going on): `npm install` will become
`path/to/shim/node.cmd path/to/npm-cli.js install`.

If the spawned process is not Node or npm (or a shell invoking them),
no application-specific logic is applied. But the general environment patching
is still applied.
This step is fairly simple: it just ensures that the shim directory is the
first location in the `PATH` environment variable. It means that any subprocess
inheriting this environment and trying to spawn Node using `node` instead of
an absolute path will default to use the shim executable.

### Arguments

The library distinguishes between two types of arguments: execution arguments
(`execArgs` and application arguments (`args`). Execution arguments control the
Node engine. They corresponds to the flags described in `node --help`. For
example `["--eval", "2+2"]`, `["--require", "/foo.js"]` or
`["--experimental-modules"]`. The application arguments are the path to the
executable (e.g. `/usr/bin/node`) and other remaining arguments such as the
path to the script to run.
The execution arguments can be read as `process.execArgv` while the application
arguments are in `process.args`.

The application arguments are only handled by user code so it there are no
real constraint to modify them in the wrapper before running the main module.
On the other hand, execution arguments are only applied when the application
starts. If you want to modify them, you need to pass the updated execution
arguments to a subprocess.

For this reason, in `sameProcess=false` mode, the execution arguments are not
applied to the wrapper but to the child subprocess.

## Migrating from version `1.x` to `2.x`

The minimum supported version is Node 6. It may work with older versions but
no guarantees are provided. If you are still using older Node versions, you
should first migrate to a newer version.

`spawn-wrap@1` exposed a single function as its `module.exports` value.
`spawn-wrap@2` exposes multiple functions using named exports.

The equivalent of function from version `1.x` is `patchInternals`. It patches
the internals of `child_process` and returns an `unwrap` function.
However, the signature is not the same.

In the first version, you could pass an array of arguments and an object
representing extra environment variables.

In version `2.x`, you can pass a `wrapper` path and `data` object.

- The `env` argument from version `1.x` can replaced by manually patching
  `process.env` from inside the `wrapper`. If you have some
  dynamically-computed values, you can pass them through the `data` option.

  - Version 1
    ```javascript
    // main.js
    const spawnWrap = require('spawn-wrap');
    spawnWrap(['wrapper.js'], {FOO: 'foo', BAR: process.pid})
    ```
    ```javascript
    // wrapper.js
    const spawnWrap = require('spawn-wrap');
    spawnWrap.runMain()
    ```

  - Version 2
    ```javascript
    // main.js
    const spawnWrap = require('spawn-wrap');
    spawnWrap.patchInternals({wrapper: 'wrapper.js', data: process.pid})
    ```
    ```javascript
    // wrapper.js
    module.exports = function(wrapper) {
      process.env.FOO = 'foo1'
      process.env.BAR = wrapper.context.data.toString(10)
      wrapper.runMain();
    }
    ```

- The `args` argument from version `1.x` was either used to pass data to the
  wrapper (then use `data` in version 2) or force some Node arguments
  (`process.execArgv`). If you want to force node arguments, you need to spawn
  the main module in a subprocess using `sameProcess=false` mode.
  
  ```javascript
  // main.js
  const spawnWrap = require('spawn-wrap');
  spawnWrap.patchInternals({wrapper: 'wrapper.js', sameProcess: false})
  ```
  ```javascript
  // wrapper.js
  module.exports = function(wrapper) {
    const extraArgs = [
      '--require', '@babel/register',
          // If you want to ensure the sub-childs are wrapped too.
      // (opt-in in `sameProcess=false` mode)
      '--require', wrapper.context.preloadScript,
    ]
    const foregroundChild = wrapper.context.deps.foregroundChild;
    foregroundChild(process.execPath, [...extraArgs, ...wrapper.args])
  }
  ```
