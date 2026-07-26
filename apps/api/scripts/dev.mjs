import console from 'node:console';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, URL } from 'node:url';

const apiRoot = fileURLToPath(new URL('../', import.meta.url));
const distMain = fileURLToPath(new URL('../dist/main.js', import.meta.url));
const workspaceRequire = createRequire(new URL('../../../package.json', import.meta.url));
const typescriptEntry = workspaceRequire.resolve('typescript');
const typescriptCli = resolve(dirname(typescriptEntry), 'tsc.js');
const compileArguments = ['--project', 'tsconfig.json'];
const children = new Set();

let rawInputEnabled = false;
let shuttingDown = false;

function validatePid(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    throw new Error(`Refusing to terminate invalid child PID: ${String(pid)}`);
  }

  return pid;
}

function isProcessRunning(pid) {
  try {
    process.kill(validatePid(pid), 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') {
      return false;
    }

    throw error;
  }
}

function spawnNode(arguments_, stdin = 'inherit') {
  const child = spawn(process.execPath, arguments_, {
    cwd: apiRoot,
    detached: process.platform !== 'win32',
    env: process.env,
    stdio: [stdin, 'inherit', 'inherit'],
  });

  children.add(child);
  child.once('close', () => children.delete(child));

  return child;
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

function waitForClose(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }

  return new Promise((resolve) => child.once('close', resolve));
}

async function runTaskkill(pid) {
  const taskkill = spawn('taskkill.exe', ['/PID', String(validatePid(pid)), '/T', '/F'], {
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
  return waitForExit(taskkill);
}

async function terminateChildTree(child, signal) {
  const pid = validatePid(child.pid);

  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  if (process.platform === 'win32') {
    const result = await runTaskkill(pid);

    if (result.code !== 0) {
      await Promise.race([waitForClose(child), delay(1000)]);

      if (isProcessRunning(pid)) {
        throw new Error(
          `taskkill failed for PID ${pid} with ${result.signal ? `signal ${result.signal}` : `code ${String(result.code)}`}`,
        );
      }
    }
  } else {
    process.kill(-pid, signal);
  }

  await waitForClose(child);
}

function restoreInput() {
  if (rawInputEnabled) {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    rawInputEnabled = false;
  }
}

async function shutdown(signal, exitCode, excludedChild) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  restoreInput();

  const activeChildren = [...children].filter(
    (child) =>
      child !== excludedChild && child.exitCode === null && child.signalCode === null,
  );

  try {
    await Promise.all(activeChildren.map((child) => terminateChildTree(child, signal)));
    process.exit(exitCode);
  } catch (error) {
    console.error('[api:dev] process-tree cleanup failed', error);
    process.exit(1);
  }
}

function monitorChild(name, child) {
  child.once('error', (error) => {
    if (!shuttingDown) {
      console.error(`[api:dev] ${name} failed to start`, error);
      void shutdown('SIGTERM', 1, child);
    }
  });

  child.once('exit', (code, signal) => {
    if (!shuttingDown) {
      const reason = signal ? `signal ${signal}` : `code ${code ?? 'unknown'}`;
      const exitCode = typeof code === 'number' && code !== 0 ? code : 1;

      console.error(`[api:dev] ${name} exited unexpectedly with ${reason}`);
      void shutdown('SIGTERM', exitCode, child);
    }
  });
}

function registerShutdownHandlers() {
  process.once('SIGINT', () => {
    void shutdown('SIGINT', 0);
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM', 0);
  });

  if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    rawInputEnabled = true;
    process.stdin.on('data', (input) => {
      if (input.includes(3)) {
        void shutdown('SIGINT', 0);
      }
    });
  }
}

async function main() {
  registerShutdownHandlers();

  const initialCompile = spawnNode([typescriptCli, ...compileArguments], 'ignore');
  const initialResult = await waitForExit(initialCompile);

  if (shuttingDown) {
    return;
  }

  if (initialResult.code !== 0) {
    const reason = initialResult.signal
      ? `signal ${initialResult.signal}`
      : `code ${initialResult.code ?? 'unknown'}`;

    restoreInput();
    console.error(`[api:dev] initial TypeScript compile failed with ${reason}`);
    process.exit(initialResult.code ?? 1);
  }

  const compilerWatch = spawnNode([
    typescriptCli,
    ...compileArguments,
    '--watch',
    '--preserveWatchOutput',
  ]);
  const nodeWatch = spawnNode(['--watch', distMain]);

  console.log(
    `[api:dev] runner pid=${process.pid} compiler-watch pid=${compilerWatch.pid} node-watch pid=${nodeWatch.pid}`,
  );

  monitorChild('TypeScript watch', compilerWatch);
  monitorChild('Node watch', nodeWatch);
}

main().catch((error) => {
  console.error('[api:dev] failed', error);
  void shutdown('SIGTERM', 1);
});
