import { defineConfig } from '@playwright/test';

const baseURL = process.env.COMPOSE_BASE_URL ?? 'http://app.localhost:8088';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.compose.spec.ts',
  timeout: 30_000,
  expect: { timeout: 15_000 },
  use: { baseURL },
});
