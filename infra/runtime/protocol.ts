export const LIFECYCLE_PROTOCOL_VERSION = 1 as const;
export const STARTUP_DURATION_MS = 30 * 60 * 1_000;
export const EXPIRY_DURATION_MS = 4 * 60 * 60 * 1_000;

export interface PreviewIdentity {
  repositoryId: string;
  pullRequestNumber: number;
}

interface CommandBase {
  protocolVersion: typeof LIFECYCLE_PROTOCOL_VERSION;
  commandId: string;
  eventSequence: number;
  expectedStateRevision: number | null;
  identity: PreviewIdentity;
}

export interface AdmitCommand extends CommandBase {
  type: 'admit';
  revision: string;
}

export interface HealthCommand extends CommandBase {
  type: 'healthy';
  generation: string;
}

export interface DeadlineCommand extends CommandBase {
  type: 'deadline';
  generation: string;
  deadline: 'startup' | 'expiry';
}

export interface CloseCommand extends CommandBase {
  type: 'close';
}

export interface CleanupCompleteCommand extends CommandBase {
  type: 'cleanup-complete';
  generation: string;
}

export interface ReconcileCommand extends CommandBase {
  type: 'reconcile';
}

export type LifecycleCommand =
  | AdmitCommand
  | HealthCommand
  | DeadlineCommand
  | CloseCommand
  | CleanupCompleteCommand
  | ReconcileCommand;

export function commandEventSequence(
  type: LifecycleCommand['type'],
  sourceSequence: number,
  lastEventSequence: number,
): number {
  return type === 'admit' || type === 'close'
    ? sourceSequence
    : Math.max(sourceSequence, lastEventSequence + 1);
}

export type GenerationPhase = 'launching' | 'healthy' | 'cleaning';
export type CleanupReason = 'replaced' | 'closed' | 'startup-timeout' | 'expired';

export interface PreviewGeneration {
  id: string;
  ordinal: number;
  revision: string;
  admittedAt: string;
  startupDeadline: string;
  healthyAt: string | null;
  expiresAt: string | null;
  phase: GenerationPhase;
  cleanupReason: CleanupReason | null;
}

export interface LifecycleState {
  protocolVersion: typeof LIFECYCLE_PROTOCOL_VERSION;
  identity: PreviewIdentity;
  stateRevision: number;
  generationCounter: number;
  lastEventSequence: number;
  lastCommandId: string;
  lastSuccessfulRevision: string | null;
  closed: boolean;
  active: PreviewGeneration | null;
  retiring: PreviewGeneration | null;
}

export interface PreviewOwnership extends PreviewIdentity {
  generation: string;
}

export type LifecycleEffect =
  | { type: 'ensure-preview'; ownership: PreviewOwnership; generation: PreviewGeneration }
  | { type: 'cleanup-preview'; ownership: PreviewOwnership; reason: CleanupReason };

export type TransitionDecision = 'accepted' | 'duplicate' | 'rejected';

export interface LifecycleTransition {
  decision: TransitionDecision;
  reason: string;
  retryable: boolean;
  state: LifecycleState | null;
  effects: LifecycleEffect[];
}

export interface LifecycleTransitionInput {
  state: LifecycleState | null;
  command: LifecycleCommand;
  now: string;
}

export interface RuntimeSchema<T> {
  parse(value: unknown): T;
}

function fail(path: string, detail: string): never {
  throw new TypeError(`${path}: ${detail}`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(path, 'expected an object');
  }
  return value as Record<string, unknown>;
}

function keys(value: Record<string, unknown>, expected: readonly string[], path: string): void {
  const unexpected = Object.keys(value).find((key) => !expected.includes(key));
  if (unexpected !== undefined) fail(`${path}.${unexpected}`, 'unknown field');
  const missing = expected.find((key) => !(key in value));
  if (missing !== undefined) fail(`${path}.${missing}`, 'missing field');
}

function string(value: Record<string, unknown>, key: string, path: string): string {
  const field = value[key];
  if (typeof field !== 'string' || field.length === 0 || field.length > 256) {
    return fail(`${path}.${key}`, 'expected 1 to 256 characters');
  }
  return field;
}

function integer(value: Record<string, unknown>, key: string, path: string, minimum = 0): number {
  const field = value[key];
  if (typeof field !== 'number' || !Number.isSafeInteger(field) || field < minimum) {
    return fail(`${path}.${key}`, `expected an integer of at least ${String(minimum)}`);
  }
  return field;
}

function nullableString(value: Record<string, unknown>, key: string, path: string): string | null {
  return value[key] === null ? null : string(value, key, path);
}

function timestamp(value: string, path: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    return fail(path, 'expected a canonical ISO timestamp');
  }
  return value;
}

function sha(value: string, path: string): string {
  if (!/^[0-9a-f]{40}$/.test(value)) return fail(path, 'expected a lowercase 40 character Git SHA');
  return value;
}

function identity(value: unknown, path: string): PreviewIdentity {
  const parsed = record(value, path);
  keys(parsed, ['repositoryId', 'pullRequestNumber'], path);
  return {
    repositoryId: string(parsed, 'repositoryId', path),
    pullRequestNumber: integer(parsed, 'pullRequestNumber', path, 1),
  };
}

function base(value: Record<string, unknown>, path: string): CommandBase {
  const protocolVersion = integer(value, 'protocolVersion', path, 1);
  if (protocolVersion !== LIFECYCLE_PROTOCOL_VERSION)
    fail(`${path}.protocolVersion`, 'unsupported version');
  const expected = value.expectedStateRevision;
  if (
    expected !== null &&
    (typeof expected !== 'number' || !Number.isSafeInteger(expected) || expected < 0)
  ) {
    fail(`${path}.expectedStateRevision`, 'expected null or a non-negative integer');
  }
  return {
    protocolVersion: LIFECYCLE_PROTOCOL_VERSION,
    commandId: string(value, 'commandId', path),
    eventSequence: integer(value, 'eventSequence', path, 1),
    expectedStateRevision: expected,
    identity: identity(value.identity, `${path}.identity`),
  };
}

function parseCommand(value: unknown): LifecycleCommand {
  const parsed = record(value, 'command');
  const type = string(parsed, 'type', 'command');
  const common = [
    'protocolVersion',
    'type',
    'commandId',
    'eventSequence',
    'expectedStateRevision',
    'identity',
  ];
  if (type === 'admit') {
    keys(parsed, [...common, 'revision'], 'command');
    return {
      ...base(parsed, 'command'),
      type,
      revision: sha(string(parsed, 'revision', 'command'), 'command.revision'),
    };
  }
  if (type === 'healthy' || type === 'cleanup-complete') {
    keys(parsed, [...common, 'generation'], 'command');
    return {
      ...base(parsed, 'command'),
      type,
      generation: string(parsed, 'generation', 'command'),
    };
  }
  if (type === 'deadline') {
    keys(parsed, [...common, 'generation', 'deadline'], 'command');
    const deadline = string(parsed, 'deadline', 'command');
    if (deadline !== 'startup' && deadline !== 'expiry')
      fail('command.deadline', 'unsupported deadline');
    return {
      ...base(parsed, 'command'),
      type,
      generation: string(parsed, 'generation', 'command'),
      deadline,
    };
  }
  if (type === 'close' || type === 'reconcile') {
    keys(parsed, common, 'command');
    return { ...base(parsed, 'command'), type };
  }
  return fail('command.type', 'unsupported command type');
}

function parseGeneration(value: unknown, path: string): PreviewGeneration {
  const parsed = record(value, path);
  keys(
    parsed,
    [
      'id',
      'ordinal',
      'revision',
      'admittedAt',
      'startupDeadline',
      'healthyAt',
      'expiresAt',
      'phase',
      'cleanupReason',
    ],
    path,
  );
  const phase = string(parsed, 'phase', path);
  if (phase !== 'launching' && phase !== 'healthy' && phase !== 'cleaning')
    fail(`${path}.phase`, 'unsupported phase');
  const cleanupReason = nullableString(parsed, 'cleanupReason', path);
  if (
    cleanupReason !== null &&
    !['replaced', 'closed', 'startup-timeout', 'expired'].includes(cleanupReason)
  ) {
    fail(`${path}.cleanupReason`, 'unsupported cleanup reason');
  }
  const healthyAt = nullableString(parsed, 'healthyAt', path);
  const expiresAt = nullableString(parsed, 'expiresAt', path);
  if (healthyAt !== null) timestamp(healthyAt, `${path}.healthyAt`);
  if (expiresAt !== null) timestamp(expiresAt, `${path}.expiresAt`);
  const hasHealthyAt = healthyAt !== null;
  const hasExpiresAt = expiresAt !== null;
  if (hasHealthyAt !== hasExpiresAt)
    fail(path, 'health timestamps must be both null or both present');
  if (phase === 'healthy' && !hasHealthyAt) fail(path, 'healthy phase requires health timestamps');
  if (phase === 'launching' && hasHealthyAt)
    fail(path, 'launching phase cannot have health timestamps');
  if ((phase === 'cleaning') !== (cleanupReason !== null))
    fail(path, 'cleanup reason does not match phase');
  return {
    id: string(parsed, 'id', path),
    ordinal: integer(parsed, 'ordinal', path, 1),
    revision: sha(string(parsed, 'revision', path), `${path}.revision`),
    admittedAt: timestamp(string(parsed, 'admittedAt', path), `${path}.admittedAt`),
    startupDeadline: timestamp(string(parsed, 'startupDeadline', path), `${path}.startupDeadline`),
    healthyAt,
    expiresAt,
    phase,
    cleanupReason: cleanupReason as CleanupReason | null,
  };
}

function parseState(value: unknown): LifecycleState {
  const parsed = record(value, 'state');
  const hasRevisionFence = Object.hasOwn(parsed, 'lastSuccessfulRevision');
  const stateKeys = [
    'protocolVersion',
    'identity',
    'stateRevision',
    'generationCounter',
    'lastEventSequence',
    'lastCommandId',
    'closed',
    'active',
    'retiring',
  ] as const;
  keys(parsed, hasRevisionFence ? [...stateKeys, 'lastSuccessfulRevision'] : stateKeys, 'state');
  const protocolVersion = integer(parsed, 'protocolVersion', 'state', 1);
  if (protocolVersion !== LIFECYCLE_PROTOCOL_VERSION)
    fail('state.protocolVersion', 'unsupported version');
  const active = parsed.active === null ? null : parseGeneration(parsed.active, 'state.active');
  const retiring =
    parsed.retiring === null ? null : parseGeneration(parsed.retiring, 'state.retiring');
  const lastSuccessfulRevision = hasRevisionFence
    ? parsed.lastSuccessfulRevision === null
      ? null
      : sha(string(parsed, 'lastSuccessfulRevision', 'state'), 'state.lastSuccessfulRevision')
    : active !== null && active.healthyAt !== null
      ? active.revision
      : null;
  if (retiring !== null && retiring.phase !== 'cleaning')
    fail('state.retiring.phase', 'must be cleaning');
  if (typeof parsed.closed !== 'boolean') fail('state.closed', 'expected a boolean');
  return {
    protocolVersion: LIFECYCLE_PROTOCOL_VERSION,
    identity: identity(parsed.identity, 'state.identity'),
    stateRevision: integer(parsed, 'stateRevision', 'state'),
    generationCounter: integer(parsed, 'generationCounter', 'state'),
    lastEventSequence: integer(parsed, 'lastEventSequence', 'state', 1),
    lastCommandId: string(parsed, 'lastCommandId', 'state'),
    lastSuccessfulRevision,
    closed: parsed.closed,
    active,
    retiring,
  };
}

export const lifecycleCommandSchema: RuntimeSchema<LifecycleCommand> = { parse: parseCommand };
export const lifecycleStateSchema: RuntimeSchema<LifecycleState> = { parse: parseState };

function sameIdentity(left: PreviewIdentity, right: PreviewIdentity): boolean {
  return (
    left.repositoryId === right.repositoryId && left.pullRequestNumber === right.pullRequestNumber
  );
}

function owned(identityValue: PreviewIdentity, generation: string): PreviewOwnership {
  return { ...identityValue, generation };
}

function effectsFor(state: LifecycleState): LifecycleEffect[] {
  const effects: LifecycleEffect[] = [];
  if (state.active?.phase === 'launching') {
    effects.push({
      type: 'ensure-preview',
      ownership: owned(state.identity, state.active.id),
      generation: state.active,
    });
  }
  for (const generation of [state.active, state.retiring]) {
    if (generation?.phase === 'cleaning' && generation.cleanupReason !== null) {
      effects.push({
        type: 'cleanup-preview',
        ownership: owned(state.identity, generation.id),
        reason: generation.cleanupReason,
      });
    }
  }
  return effects;
}

function rejected(
  state: LifecycleState | null,
  reason: string,
  retryable = false,
): LifecycleTransition {
  return { decision: 'rejected', reason, retryable, state, effects: [] };
}

function duplicate(state: LifecycleState, reason: string): LifecycleTransition {
  return { decision: 'duplicate', reason, retryable: false, state, effects: effectsFor(state) };
}

function advance(
  state: LifecycleState,
  command: LifecycleCommand,
  change: Partial<LifecycleState>,
): LifecycleState {
  return {
    ...state,
    ...change,
    stateRevision: state.stateRevision + 1,
    lastEventSequence: command.eventSequence,
    lastCommandId: command.commandId,
  };
}

function semanticDuplicate(
  state: LifecycleState,
  command: LifecycleCommand,
  reason: string,
): LifecycleTransition {
  return duplicate(advance(state, command, {}), reason);
}

function generation(
  identityValue: PreviewIdentity,
  ordinal: number,
  revision: string,
  now: string,
): PreviewGeneration {
  return {
    id: `preview-${identityValue.repositoryId}-${String(identityValue.pullRequestNumber)}-${String(ordinal)}`,
    ordinal,
    revision,
    admittedAt: now,
    startupDeadline: new Date(Date.parse(now) + STARTUP_DURATION_MS).toISOString(),
    healthyAt: null,
    expiresAt: null,
    phase: 'launching',
    cleanupReason: null,
  };
}

function cleaning(value: PreviewGeneration, reason: CleanupReason): PreviewGeneration {
  return { ...value, phase: 'cleaning', cleanupReason: reason };
}

function accepted(state: LifecycleState): LifecycleTransition {
  return {
    decision: 'accepted',
    reason: 'accepted',
    retryable: false,
    state,
    effects: effectsFor(state),
  };
}

export function transitionLifecycle(input: LifecycleTransitionInput): LifecycleTransition {
  const command = lifecycleCommandSchema.parse(input.command);
  const now = timestamp(input.now, 'now');
  const state = input.state === null ? null : lifecycleStateSchema.parse(input.state);
  if (state === null) {
    if (command.type !== 'admit') return rejected(null, 'preview-does-not-exist');
    if (command.expectedStateRevision !== null) return rejected(null, 'state-revision-mismatch');
    const active = generation(command.identity, 1, command.revision, now);
    return accepted({
      protocolVersion: LIFECYCLE_PROTOCOL_VERSION,
      identity: command.identity,
      stateRevision: 1,
      generationCounter: 1,
      lastEventSequence: command.eventSequence,
      lastCommandId: command.commandId,
      lastSuccessfulRevision: null,
      closed: false,
      active,
      retiring: null,
    });
  }
  if (!sameIdentity(state.identity, command.identity)) return rejected(state, 'identity-mismatch');
  if (command.commandId === state.lastCommandId) return duplicate(state, 'duplicate-command');
  if (command.expectedStateRevision !== state.stateRevision)
    return rejected(state, 'state-revision-mismatch');
  if (command.eventSequence <= state.lastEventSequence)
    return rejected(state, 'event-is-not-newer');

  if (command.type === 'admit') {
    if (state.closed) return rejected(state, 'preview-is-closed');
    if (state.active?.revision === command.revision)
      return semanticDuplicate(state, command, 'revision-already-admitted');
    if (state.retiring !== null) return rejected(state, 'retiring-cleanup-pending', true);
    if (state.active === null) {
      if (state.lastSuccessfulRevision === command.revision)
        return semanticDuplicate(state, command, 'revision-already-admitted');
      const active = generation(state.identity, state.generationCounter + 1, command.revision, now);
      return accepted(
        advance(state, command, {
          generationCounter: active.ordinal,
          active,
          retiring: null,
        }),
      );
    }
    if (state.lastSuccessfulRevision === command.revision)
      return rejected(state, 'revision-already-admitted');
    if (state.active.phase === 'cleaning') return rejected(state, 'active-cleanup-pending', true);
    const active = generation(state.identity, state.generationCounter + 1, command.revision, now);
    return accepted(
      advance(state, command, {
        generationCounter: active.ordinal,
        active,
        retiring: cleaning(state.active, 'replaced'),
      }),
    );
  }
  if (command.type === 'healthy') {
    if (state.active?.id !== command.generation) return rejected(state, 'generation-is-not-active');
    if (state.active.phase === 'healthy')
      return semanticDuplicate(state, command, 'generation-is-already-healthy');
    if (state.active.phase === 'cleaning') return rejected(state, 'generation-is-cleaning');
    if (Date.parse(now) > Date.parse(state.active.startupDeadline))
      return rejected(state, 'startup-deadline-elapsed');
    const active = {
      ...state.active,
      phase: 'healthy' as const,
      healthyAt: now,
      expiresAt: new Date(Date.parse(now) + EXPIRY_DURATION_MS).toISOString(),
    };
    return accepted(
      advance(state, command, {
        active,
        lastSuccessfulRevision: state.active.revision,
      }),
    );
  }
  if (command.type === 'deadline') {
    if (state.active?.id !== command.generation) return rejected(state, 'generation-is-not-active');
    if (state.active.phase === 'cleaning')
      return semanticDuplicate(state, command, 'cleanup-already-scheduled');
    const deadline =
      command.deadline === 'startup' ? state.active.startupDeadline : state.active.expiresAt;
    const expectedPhase = command.deadline === 'startup' ? 'launching' : 'healthy';
    if (
      state.active.phase !== expectedPhase ||
      deadline === null ||
      Date.parse(now) < Date.parse(deadline)
    )
      return rejected(state, 'deadline-not-reached');
    return accepted(
      advance(state, command, {
        active: cleaning(
          state.active,
          command.deadline === 'startup' ? 'startup-timeout' : 'expired',
        ),
      }),
    );
  }
  if (command.type === 'close') {
    const active =
      state.active === null || state.active.phase === 'cleaning'
        ? state.active
        : cleaning(state.active, 'closed');
    return accepted(advance(state, command, { closed: true, active }));
  }
  if (command.type === 'cleanup-complete') {
    if (state.active?.id === command.generation) {
      if (state.active.phase !== 'cleaning') return rejected(state, 'cleanup-not-requested');
      return accepted(advance(state, command, { active: null }));
    }
    if (state.retiring?.id === command.generation)
      return accepted(advance(state, command, { retiring: null }));
    return rejected(state, 'generation-is-not-tracked');
  }
  return accepted(advance(state, command, {}));
}
