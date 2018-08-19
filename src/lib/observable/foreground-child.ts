import cp from "child_process";
import crossSpawn from "cross-spawn";
import signalExit from "signal-exit";

// Simplified version of `foregroundChild` that does not share the stdio fd but
// uses pipes.
export function foregroundChild(
  file: string,
  args: ReadonlyArray<string>,
  onClose?: () => Promise<any>,
): cp.ChildProcess {
  const resolvedOnClose: () => Promise<any> = onClose !== undefined ? onClose : () => Promise.resolve();
  const stdio: cp.StdioOptions = ["pipe", "pipe", "pipe"];
  if (process.send) {
    stdio.push("ipc");
  }
  // TODO: Fix `cross-spawn` types to accept `ReadonlyArray`.
  const child: cp.ChildProcess = crossSpawn(file, [...args], {stdio});

  process.stdin.pipe(child.stdin);
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);

  let childExited = false;
  const unproxySignals: () => void = proxySignals(child);
  process.on("exit", childHangup);

  function childHangup() {
    child.kill("SIGHUP");
  }

  child.on("close", async (code: number, signal: NodeJS.Signals | null) => {
    await resolvedOnClose();

    unproxySignals();
    process.removeListener("exit", childHangup);
    childExited = true;
    if (signal !== null) {
      // If there is nothing else keeping the event loop alive,
      // then there's a race between a graceful exit and getting
      // the signal to this process.  Put this timeout here to
      // make sure we're still alive to get the signal, and thus
      // exit with the intended signal code.
      setTimeout(() => undefined, 200);
      process.kill(process.pid, signal);
    } else {
      process.exit(process.exitCode);
    }
  });

  if (process.send !== undefined) {
    process.removeAllListeners("message");

    child.on("message", (message, sendHandle) => process.send!(message, sendHandle));
    process.on("message", (message, sendHandle) => child.send(message, sendHandle));
  }

  return child;
}

function proxySignals(child: cp.ChildProcess): () => void {
  const listeners: Map<NodeJS.Signals, () => void> = new Map();
  const signals: ReadonlyArray<NodeJS.Signals> = signalExit.signals();
  for (const signal of signals) {
    const handler: () => void = () => child.kill(signal);
    listeners.set(signal, handler);
    process.on(signal, handler);
  }

  return unproxySignals;

  function unproxySignals(): void {
    for (const [signal, handler] of listeners) {
      process.removeListener(signal, handler);
    }
  }
}
