import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dispatchLifecycle,
  dueDeadlineCommand,
  type LifecycleStateStore,
  type PreviewEffectProvider,
} from './controller.js';
import type { LifecycleEffect, LifecycleState } from './protocol.js';

class MemoryStore implements LifecycleStateStore {
  public state: LifecycleState | null = null;
  public forceConflict = false;

  public async load(): Promise<LifecycleState | null> {
    return this.state;
  }

  public async compareAndSwap(next: LifecycleState): Promise<'stored' | 'conflict'> {
    if (this.forceConflict) return 'conflict';
    this.state = next;
    return 'stored';
  }

  public async *list(): AsyncIterable<LifecycleState> {
    if (this.state !== null) yield this.state;
  }
}

class RecordingProvider implements PreviewEffectProvider {
  public readonly effects: LifecycleEffect[] = [];

  public async ensurePreview(
    effect: Extract<LifecycleEffect, { type: 'ensure-preview' }>,
  ): Promise<void> {
    this.effects.push(effect);
  }

  public async cleanupPreview(
    effect: Extract<LifecycleEffect, { type: 'cleanup-preview' }>,
  ): Promise<void> {
    this.effects.push(effect);
  }
}

class FailingCleanupProvider extends RecordingProvider {
  public override async cleanupPreview(
    effect: Extract<LifecycleEffect, { type: 'cleanup-preview' }>,
  ): Promise<void> {
    await super.cleanupPreview(effect);
    throw new Error('provider cleanup failed');
  }
}

const admit = {
  protocolVersion: 1,
  type: 'admit',
  commandId: 'admit-1',
  eventSequence: 1,
  expectedStateRevision: null,
  identity: { repositoryId: '123', pullRequestNumber: 7 },
  revision: 'a'.repeat(40),
} as const;

test('controller persists ownership before attempting provider effects', async () => {
  const store = new MemoryStore();
  const provider = new RecordingProvider();
  const result = await dispatchLifecycle(admit, '2026-01-01T00:00:00.000Z', store, provider);
  assert.equal(result.decision, 'accepted');
  assert.equal(store.state?.active?.id, 'preview-123-7-1');
  assert.equal(provider.effects.length, 1);
});

test('controller does not execute provider effects after a state conflict', async () => {
  const store = new MemoryStore();
  store.forceConflict = true;
  const provider = new RecordingProvider();
  const result = await dispatchLifecycle(admit, '2026-01-01T00:00:00.000Z', store, provider);
  assert.equal(result.decision, 'conflict');
  assert.equal(provider.effects.length, 0);
});

test('sweeper creates a generation-bound deadline command only when due', async () => {
  const store = new MemoryStore();
  await dispatchLifecycle(admit, '2026-01-01T00:00:00.000Z', store, new RecordingProvider());
  const state = store.state;
  assert.notEqual(state, null);
  if (state === null) return;
  assert.equal(dueDeadlineCommand(state, '2026-01-01T00:29:59.000Z'), null);
  const command = dueDeadlineCommand(state, '2026-01-01T00:30:00.000Z');
  assert.equal(command?.type, 'deadline');
  assert.equal(command?.type === 'deadline' ? command.deadline : null, 'startup');
});

test('factory.lifecycle.provider-failure retains cleaning state for reconciliation', async () => {
  const store = new MemoryStore();
  await dispatchLifecycle(admit, '2026-01-01T00:00:00.000Z', store, new RecordingProvider());
  const current = store.state;
  assert.notEqual(current, null);
  if (current === null) return;
  await assert.rejects(
    dispatchLifecycle(
      {
        protocolVersion: 1,
        type: 'close',
        commandId: 'close-1',
        eventSequence: 2,
        expectedStateRevision: current.stateRevision,
        identity: current.identity,
      },
      '2026-01-01T00:01:00.000Z',
      store,
      new FailingCleanupProvider(),
    ),
    /provider cleanup failed/,
  );
  assert.equal(store.state?.active?.phase, 'cleaning');
  assert.equal(store.state?.active?.cleanupReason, 'closed');
});
