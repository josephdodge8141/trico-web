import assert from 'node:assert/strict';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import test from 'node:test';

import { startServer } from './index.js';
import { createConnections, type Connections } from './config/connections.js';
import type { Environment } from './config/environment.js';

const environment = (port: number, shutdownTimeoutMs = 100): Environment => ({
  appEnvironment: 'test',
  host: '127.0.0.1',
  port,
  shutdownTimeoutMs,
  publicOrigin: 'http://127.0.0.1',
  awsRegion: 'us-west-2',
  dynamoTable: 'trico-web-test',
  s3Bucket: 'trico-web-test',
  s3ForcePathStyle: true,
  mailTransport: 'smtp',
  smtpHost: '127.0.0.1',
  smtpPort: 1025,
  emailFrom: 'website@tricoinc.com',
  bedrockMode: 'fixture',
  sessionCookieName: 'trico_session',
  cookieSecure: false,
});

const trackedConnections = (
  close: () => Promise<void>,
  forceAbort: () => void = (): void => undefined,
): Connections => ({
  ...createConnections(),
  close,
  forceAbort,
});

const freePort = async (): Promise<number> => {
  const listener = createServer().listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const address = listener.address();
  assert.ok(address !== null && typeof address === 'object');
  const port = address.port;
  listener.close();
  await once(listener, 'close');
  return port;
};

test('failed listen closes config connections before rejecting', async () => {
  const holder = await startServer(environment(0), createConnections());
  const address = holder.server.address();
  assert.ok(address !== null && typeof address === 'object');
  let closeCalls = 0;
  const connections = trackedConnections(async () => {
    closeCalls += 1;
  });

  try {
    await assert.rejects(startServer(environment(address.port), connections), /EADDRINUSE/);
    assert.equal(closeCalls, 1);
  } finally {
    await holder.shutdown();
  }
});

test('shutdown is idempotent, aborts a hung config close, and reports the timeout', async () => {
  let closeCalls = 0;
  let abortCalls = 0;
  const connections = trackedConnections(
    async () => {
      closeCalls += 1;
      await new Promise<void>(() => undefined);
    },
    () => {
      abortCalls += 1;
    },
  );
  const running = await startServer(environment(0, 10), connections);

  await assert.rejects(Promise.all([running.shutdown(), running.shutdown()]), {
    name: 'ConnectionShutdownTimeoutError',
  });
  assert.equal(closeCalls, 1);
  assert.equal(abortCalls, 1);
  assert.equal(running.server.listening, false);
});

test('programmatic shutdown surfaces close and forced cleanup failures', async () => {
  let abortCalls = 0;
  const connections = trackedConnections(
    async () => {
      throw new Error('close failed');
    },
    () => {
      abortCalls += 1;
      throw new Error('force abort failed');
    },
  );
  const running = await startServer(environment(0), connections);

  await assert.rejects(running.shutdown(), (error: unknown) => {
    assert.ok(error instanceof AggregateError);
    assert.equal(error.cause instanceof Error ? error.cause.message : error.cause, 'close failed');
    assert.equal(error.errors.length, 2);
    return true;
  });
  assert.equal(abortCalls, 1);
  assert.equal(running.server.listening, false);
});

test('the development entrypoint serves health and exits on SIGTERM', async () => {
  const port = await freePort();
  const child = spawn(process.execPath, ['--import', 'tsx', 'index.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      SHUTDOWN_TIMEOUT_MS: '100',
    },
    stdio: 'ignore',
  });
  const deadline = Date.now() + 5_000;
  let response: Response | undefined;
  try {
    while (Date.now() < deadline) {
      try {
        response = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
        break;
      } catch {
        await new Promise<void>((resolve) => setTimeout(resolve, 25));
      }
    }
    assert.ok(response !== undefined, 'child backend did not start');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    child.kill('SIGTERM');
    const [code, signal] = (await once(child, 'exit')) as [number | null, NodeJS.Signals | null];
    assert.equal(code, 0);
    assert.equal(signal, null);
  } finally {
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});

test('a signal shutdown aborts a retained resource when config close rejects', async () => {
  const child = spawn(process.execPath, ['--import', 'tsx', 'shutdown-child.ts'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  const ready = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('child backend did not start')), 5_000);
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes('ready')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.once('error', (error: Error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
  try {
    await ready;
    child.kill('SIGTERM');
    const [code, signal] = await Promise.race([
      once(child, 'exit') as Promise<[number | null, NodeJS.Signals | null]>,
      new Promise<never>((_, reject) => {
        const timeout = setTimeout(() => reject(new Error('child did not exit')), 1_000);
        timeout.unref();
      }),
    ]);
    assert.equal(code, 1);
    assert.equal(signal, null);
  } finally {
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});

test('a signal shutdown exits when forced cleanup fails with a retained resource', async () => {
  const child = spawn(process.execPath, ['--import', 'tsx', 'shutdown-abort-failure-child.ts'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  const ready = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('child backend did not start')), 5_000);
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes('ready')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.once('error', (error: Error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
  try {
    await ready;
    child.kill('SIGTERM');
    const [code, signal] = await Promise.race([
      once(child, 'exit') as Promise<[number | null, NodeJS.Signals | null]>,
      new Promise<never>((_, reject) => {
        const timeout = setTimeout(() => reject(new Error('child did not exit')), 1_000);
        timeout.unref();
      }),
    ]);
    assert.equal(code, 1);
    assert.equal(signal, null);
  } finally {
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
