import cp from "child_process";
import { SwContext, SwMode } from "./context";

export interface RootProcess {
  pid: number;
  execPath: string;
}

export interface WrapperApi<D = any> {
  context: SwContext<D>;

  args: ReadonlyArray<string>;

  runMain?(): void;
}

export interface SwOptions {
  /**
   * Path to the wrapper module.
   *
   * The wrapper module will be required at the beginnig of each spawned Node
   * process.
   * If its `module.exports` is a function or its `default` named export is a
   * function, this function will be called with a `WrapperApi` object.
   *
   * The path is resolved with `path.resolve` to ensure it is absolute.
   */
  wrapper: string;

  /**
   * A JSON-stringifyable object that will be passed the the wrapper main.
   *
   * This object will be used as the value of the `data` property of
   * `WrapperApi`.
   */
  data: any;

  /**
   * Location where the shim directories will be created.
   *
   * Default:
   * - If the env var `SPAWN_WRAP_SHIM_ROOT`, use its value
   * - Otherwise, `.node-spawn-wrap` directory inside user's home dir.
   */
  shimRoot?: string;

  /**
   * Run the wrapped and wrapper modules in the same process or not.
   *
   * See `SwMode` documentation for more details.
   */
  mode: SwMode;
}

/**
 * Options used by the internal spawn and spawnSync functions
 */
export interface InternalSpawnOptions {
  file: string;
  args: string[];
  cwd?: string;
  windowsHide: boolean;
  windowsVerbatimArguments: boolean;
  detached: boolean;
  envPairs: string[];
  stdio?: cp.StdioOptions;
  uid?: number;
  gid?: number;
}

/**
 * Options transformed by the mungers.
 */
export interface NormalizedOptions {
  /**
   * Executable path
   *
   * Relative or absolute.
   */
  readonly file: string;

  /**
   * Argv0 followed by arguments.
   *
   * Argv0 is often the same as `file` but not always (can be changed with the
   * `spawn` option `argv0`).
   * Example:
   * ```
   * ["node", "--experimental-modules", "main.mjs"]
   * ```
   */
  readonly args: ReadonlyArray<string>;

  /**
   * Map of environment variables.
   *
   * The map is case sensitive and can contain both `path` and `PATH`.
   */
  readonly env: ReadonlyMap<string, string>;
}
