import assert from 'node:assert/strict';
import test from 'node:test';

import { compileNormalizedCompose } from './compose.js';

const valid = {
  'x-preview': {
    version: 1,
    router: 'caddy',
    frontend: 'frontend',
    backend: 'backend',
    task: { cpu: 1024, memoryMiB: 2048 },
  },
  services: {
    caddy: { image: 'caddy:2', ports: ['80:80'], environment: {} },
    frontend: { image: 'frontend@sha256:abc', environment: {} },
    backend: { image: 'backend@sha256:def', environment: { TABLE: 'table' } },
  },
};

test('compose compiler emits a bounded role-aware task model', () => {
  const result = compileNormalizedCompose(valid);
  assert.equal(result.services.find((service) => service.name === 'backend')?.role, 'backend');
  assert.deepEqual(result.services.find((service) => service.name === 'backend')?.environmentKeys, [
    'TABLE',
  ]);
});

test('factory.compose-unsupported-field rejects dangerous service capabilities', () => {
  for (const field of ['privileged', 'network_mode', 'devices']) {
    assert.throws(
      () =>
        compileNormalizedCompose({
          ...valid,
          services: { ...valid.services, backend: { ...valid.services.backend, [field]: true } },
        }),
      new RegExp(field),
    );
  }
});

test('compose compiler prevents dependencies from becoming public', () => {
  assert.throws(
    () =>
      compileNormalizedCompose({
        ...valid,
        services: {
          ...valid.services,
          backend: { ...valid.services.backend, ports: ['3000:3000'] },
        },
      }),
    /only the router may publish ports/,
  );
});
