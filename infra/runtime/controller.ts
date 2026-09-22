import {
  type LifecycleCommand,
  type LifecycleEffect,
  type LifecycleState,
  lifecycleCommandSchema,
  transitionLifecycle,
} from './protocol.js';

export interface LifecycleStateStore {
  load(repositoryId: string, pullRequestNumber: number): Promise<LifecycleState | null>;
  compareAndSwap(
    next: LifecycleState,
    expectedStateRevision: number | null,
  ): Promise<'stored' | 'conflict'>;
  list(): AsyncIterable<LifecycleState>;
}

export interface PreviewEffectProvider {
  ensurePreview(effect: Extract<LifecycleEffect, { type: 'ensure-preview' }>): Promise<void>;
  cleanupPreview(effect: Extract<LifecycleEffect, { type: 'cleanup-preview' }>): Promise<void>;
}

export interface DispatchResult {
  readonly decision: 'accepted' | 'duplicate' | 'rejected' | 'conflict';
  readonly reason: string;
  readonly effectsAttempted: number;
  readonly effects: readonly LifecycleEffect[];
  readonly state: LifecycleState | null;
}

function stateChanged(previous: LifecycleState | null, next: LifecycleState | null): boolean {
  return JSON.stringify(previous) !== JSON.stringify(next);
}

export async function dispatchLifecycle(
  commandValue: unknown,
  now: string,
  store: LifecycleStateStore,
  provider: PreviewEffectProvider,
): Promise<DispatchResult> {
  const command = lifecycleCommandSchema.parse(commandValue);
  const previous = await store.load(
    command.identity.repositoryId,
    command.identity.pullRequestNumber,
  );
  const transition = transitionLifecycle({ command, now, state: previous });
  if (transition.decision === 'rejected' || transition.state === null) {
    return { ...transition, effectsAttempted: 0, effects: transition.effects };
  }
  if (stateChanged(previous, transition.state)) {
    const outcome = await store.compareAndSwap(transition.state, previous?.stateRevision ?? null);
    if (outcome === 'conflict') {
      return {
        decision: 'conflict',
        reason: 'state-compare-and-swap-conflict',
        effectsAttempted: 0,
        effects: [],
        state: previous,
      };
    }
  }
  let effectsAttempted = 0;
  for (const effect of transition.effects) {
    effectsAttempted += 1;
    if (effect.type === 'ensure-preview') await provider.ensurePreview(effect);
    else await provider.cleanupPreview(effect);
  }
  return {
    decision: transition.decision,
    reason: transition.reason,
    effectsAttempted,
    effects: transition.effects,
    state: transition.state,
  };
}

export function dueDeadlineCommand(state: LifecycleState, now: string): LifecycleCommand | null {
  const active = state.active;
  if (active === null || active.phase === 'cleaning') return null;
  const deadline = active.phase === 'launching' ? active.startupDeadline : active.expiresAt;
  if (deadline === null || Date.parse(deadline) > Date.parse(now)) return null;
  const deadlineType = active.phase === 'launching' ? 'startup' : 'expiry';
  return {
    protocolVersion: 1,
    type: 'deadline',
    commandId: `sweeper-${active.id}-${deadlineType}-${deadline}`,
    eventSequence: state.lastEventSequence + 1,
    expectedStateRevision: state.stateRevision,
    identity: state.identity,
    generation: active.id,
    deadline: deadlineType,
  };
}
