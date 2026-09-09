import { startServer } from './index.js';
import { createConnections, type Connections } from './config/connections.js';
import type { Environment } from './config/environment.js';

const retainedHandle = setInterval(() => undefined, 1_000);
const connections: Connections = {
  ...createConnections(),
  close: async (): Promise<void> => {
    throw new Error('close failed');
  },
  forceAbort: (): void => {
    void retainedHandle;
    throw new Error('force abort failed');
  },
};

const environment: Environment = {
  appEnvironment: 'test',
  host: '127.0.0.1',
  port: 0,
  shutdownTimeoutMs: 10,
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
};

await startServer(environment, connections, {
  exitProcess: (code: number): void => process.exit(code),
});
process.stdout.write('ready\n');
