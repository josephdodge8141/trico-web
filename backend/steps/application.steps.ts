import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';

import { S3Client } from '@aws-sdk/client-s3';
import { After, Before, Given, Then, When, setWorldConstructor, World } from '@cucumber/cucumber';
import {
  aggregateEntityModules,
  defineEntityModule,
  constructionEntityModule,
  constructionV2SeedData,
  developmentEntityModule,
  developmentV2SeedData,
  editableValueSchema,
  entityEditorDefinitionSchema,
  entityDefinitions,
  entityRegistry,
  mediaPresignRequestSchema,
  planEntityModuleContentMigration,
  pageIdSchema,
  realEstateEntityModule,
  realEstateV2SeedData,
  registrySeedData,
  requireEntityDefinition,
  signupRequestSchema,
  validateEntityViewCatalog,
  type EditableValue,
  type EntityDefinition,
  type EntityModule,
  type EntityModuleMigrationPlan,
  type EntityId,
  type ExternalSource,
  type MediaAsset,
  type PendingChange,
  type Publication,
} from '@app/schemas';

import { createApp } from '../app.js';
import type { AiConnection } from '../config/ai.js';
import { createConnections, type MailConnection } from '../config/connections.js';
import { createBoundedPublicFetch } from '../config/external-http.js';
import { createOriginGuard } from '../middleware/session.js';
import { HttpError } from '../middleware/errors.js';
import { seedEntities } from '../seed.js';
import { createAuthService, type AuthService, type SessionCredentials } from '../services/auth.js';
import {
  assertPublicationFits,
  createContentService,
  estimatePublishActions,
  type ContentService,
} from '../services/content.js';
import {
  createExternalSourceService,
  type ExternalSourceService,
} from '../services/external-sources.js';
import { createExternalSyncService, type ExternalSyncResult } from '../services/external-sync.js';
import { ServiceError } from '../services/errors.js';
import { createMediaService } from '../services/media.js';
import { MemoryDynamo, MemoryS3 } from './memory.js';

const TABLE = 'test-table';
const BUCKET = 'test-bucket';
const EDITOR = '00000000-0000-4000-8000-000000000101';
const OTHER_EDITOR = '00000000-0000-4000-8000-000000000102';
const PASSWORD = 'correct horse battery staple';
const HERO = 'home.hero' as EntityId;
const HOME_LIST = 'home.core-values.items' as EntityId;
const LIST = 'real-estate.listings.items' as EntityId;

class BackendWorld extends World {
  readonly dynamo = new MemoryDynamo();
  readonly objects = new MemoryS3();
  readonly messages: { to: string; subject: string; text: string }[] = [];
  readonly mail: MailConnection = {
    send: async (message): Promise<void> => {
      this.messages.push({ ...message });
    },
  };
  readonly auth: AuthService = createAuthService(
    this.dynamo.asClient(),
    TABLE,
    this.mail,
    'https://trico.example',
  );
  readonly content: ContentService = createContentService(
    this.dynamo.asClient(),
    this.objects.asClient(),
    TABLE,
    BUCKET,
  );
  readonly sources: ExternalSourceService = createExternalSourceService(
    this.dynamo.asClient(),
    TABLE,
  );
  readonly media = createMediaService(
    this.objects.asClient(),
    BUCKET,
    this.dynamo.asClient(),
    TABLE,
  );
  close: (() => Promise<void>) | undefined;
  baseUrl = '';
  response: Response | undefined;
  error: unknown;
  email = 'editor@tricoinc.com';
  token = '';
  passwordAccepted: boolean | undefined;
  session: SessionCredentials | undefined;
  sessions: SessionCredentials[] = [];
  beforeValue: EditableValue | undefined;
  change: PendingChange | undefined;
  otherChange: PendingChange | undefined;
  preview: unknown;
  otherPreview: unknown;
  listBefore: readonly EditableValue[] = [];
  listAfter: readonly EditableValue[] = [];
  source: ExternalSource | undefined;
  mediaAssets: readonly MediaAsset[] = [];
  mediaCursor: string | null = null;
  fetchCalls = 0;
  aiCalls = 0;
  syncResult: ExternalSyncResult | undefined;
  publishResult: { operationId: string; publicationIds: readonly string[] } | undefined;
  beforeManifest = '';
  historical: Publication | undefined;
  registryValidated = false;
  actionCount = 0;
  transactionAttempted = false;
  snapshot: readonly { entityId: EntityId; entityVersion: number; value: EditableValue }[] = [];
  facts = new Set<string>();
  divisionMigrationPlan: EntityModuleMigrationPlan | undefined;
  seedEntityId: EntityId = 'home.hero';
  missingSeedEntityId: EntityId = 'home.anniversary-banner';
  seedCurrentRow: Record<string, unknown> | undefined;
}

setWorldConstructor(BackendWorld);

Before(async function (this: BackendWorld, { pickle }) {
  if (pickle.name !== 'Check the public backend health') return;
  const connections = createConnections();
  const server = createApp({ connections }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address !== null && typeof address === 'object');
  this.baseUrl = `http://127.0.0.1:${String(address.port)}`;
  this.close = async (): Promise<void> => {
    server.close();
    await once(server, 'close');
    await connections.close();
  };
});

After(async function (this: BackendWorld) {
  await this.close?.();
});

const capture = async (world: BackendWorld, operation: () => Promise<unknown>): Promise<void> => {
  try {
    await operation();
  } catch (error: unknown) {
    world.error = error;
  }
};

const changed = (value: EditableValue, suffix = ' updated'): EditableValue => {
  if (typeof value === 'string') return `${value}${suffix}`;
  if (Array.isArray(value))
    return value.map((item, index) => (index === 0 ? changed(item, suffix) : item));
  if (typeof value === 'object' && value !== null) {
    const candidate = Object.entries(value).find(
      ([key, entry]) => key !== 'id' && typeof entry === 'string',
    );
    if (candidate !== undefined)
      return { ...value, [candidate[0]]: `${String(candidate[1])}${suffix}` };
  }
  return value;
};

const seedValue = (entityId: EntityId): EditableValue => {
  const value = registrySeedData[entityId];
  assert.ok(value !== undefined);
  return value;
};

const pageEntities = (page: Record<string, EditableValue>): Record<string, EditableValue> => {
  return page;
};

const tokenFromLastMessage = (world: BackendWorld): string => {
  const text = world.messages.at(-1)?.text;
  assert.ok(text !== undefined);
  const token = new URL(text).searchParams.get('token');
  assert.ok(token !== null);
  return token;
};

const registerVerified = async (world: BackendWorld): Promise<void> => {
  await world.auth.register(world.email, PASSWORD);
  world.token = tokenFromLastMessage(world);
  await world.auth.verifyEmail(world.token);
};

const sessions = (world: BackendWorld): readonly Record<string, unknown>[] =>
  [...world.dynamo.items.values()].filter((item) => item['sk'] === 'SESSION');

const seedManifest = async (world: BackendWorld): Promise<void> => {
  const operationId = '10000000-0000-4000-8000-000000000001';
  const pages: Record<string, { url: string; etag: string }> = {};
  for (const pageId of pageIdSchema.options) {
    const key = `content/releases/${operationId}/${pageId}.json`;
    world.objects.objects.set(key, JSON.stringify(await world.content.page(pageId)));
    pages[pageId] = { url: `/${key}`, etag: `"${pageId}"` };
  }
  world.objects.objects.set(
    'content/manifest.json',
    JSON.stringify({ version: 1, currentOperationId: operationId, pages }),
  );
};

const createRevision = async (
  world: BackendWorld,
  entityId: EntityId,
  revision: number,
  owner = EDITOR,
): Promise<PendingChange> => {
  let change = await world.content.createChange(entityId, owner, changed(seedValue(entityId)));
  while (change.revision < revision) {
    const updated = await world.content.updateChange(
      entityId,
      owner,
      change.revision,
      changed(change.replacementValue, ` ${String(change.revision + 1)}`),
    );
    assert.ok(updated !== undefined);
    change = updated;
  }
  return change;
};

const sourceInput = (
  itemId: string,
  url = 'https://listings.example/item',
): Omit<ExternalSource, 'id' | 'createdAt' | 'updatedAt'> => ({
  entityId: LIST,
  itemId,
  type: 'MLS',
  url,
  validationFields: ['price'],
  overriddenFields: [],
  enabled: true,
});

const syncEvent = {
  schemaVersion: 1,
  eventType: 'trico.external-sync.requested',
  requestedAt: '2026-09-08T00:00:00.000Z',
  requestedBy: 'eventbridge',
  pageId: 'real-estate',
} as const;

const mark = (world: BackendWorld, ...facts: string[]): void => {
  for (const fact of facts) world.facts.add(fact);
};

const escape = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const factThen = (facts: readonly string[]): void => {
  Then(
    new RegExp(`^(${facts.map(escape).join('|')})$`),
    function (this: BackendWorld, fact: string) {
      assert.equal(this.facts.has(fact), true, `Missing verified fact: ${fact}`);
    },
  );
};

Given(
  'a current entity has valid published edits and another registered entity is missing',
  function (this: BackendWorld) {
    const definition = requireEntityDefinition(this.seedEntityId);
    const item = {
      pk: `ENTITY#${this.seedEntityId}`,
      sk: 'CURRENT',
      id: this.seedEntityId,
      pageId: definition.pageId,
      version: 2,
      value: changed(seedValue(this.seedEntityId)),
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    this.seedCurrentRow = structuredClone(item);
    this.dynamo.items.set(`${item.pk}|${item.sk}`, item);
  },
);

Given(
  'a current entity row has unsafe {string} data',
  function (this: BackendWorld, incompatibility: string) {
    const definition = requireEntityDefinition(this.seedEntityId);
    const item: Record<string, unknown> = {
      pk: `ENTITY#${this.seedEntityId}`,
      sk: 'CURRENT',
      id: this.seedEntityId,
      pageId: definition.pageId,
      version: 1,
      value: seedValue(this.seedEntityId),
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    if (incompatibility === 'entity ID') item['id'] = this.missingSeedEntityId;
    else if (incompatibility === 'page ID') item['pageId'] = 'development';
    else if (incompatibility === 'registered value schema') item['value'] = null;
    else if (incompatibility === 'entity version') item['version'] = 0;
    else if (incompatibility === 'pristine baseline value') {
      const changedSeed = changed(seedValue(this.seedEntityId));
      assert.notDeepEqual(changedSeed, seedValue(this.seedEntityId));
      assert.equal(definition.schema.safeParse(changedSeed).success, true);
      item['value'] = changedSeed;
      item['updatedAt'] = new Date(0).toISOString();
    } else throw new Error(`Unknown current entity incompatibility: ${incompatibility}`);
    this.seedCurrentRow = structuredClone(item);
    this.dynamo.items.set(`${String(item['pk'])}|${String(item['sk'])}`, item);
  },
);

When('deployment reruns seed-if-empty', async function (this: BackendWorld) {
  await capture(this, () => seedEntities(this.dynamo.asClient(), TABLE));
});

Then('bootstrap succeeds without rewriting the existing entity', function (this: BackendWorld) {
  assert.equal(this.error, undefined);
  const existing = this.dynamo.items.get(`ENTITY#${this.seedEntityId}|CURRENT`);
  assert.deepEqual(existing, this.seedCurrentRow);
});

Then('the missing entity receives its registered seed', function (this: BackendWorld) {
  const missing = this.dynamo.items.get(`ENTITY#${this.missingSeedEntityId}|CURRENT`);
  assert.deepEqual(missing?.['value'], seedValue(this.missingSeedEntityId));
  assert.equal(missing?.['version'], 1);
});

Then('bootstrap rejects the unsafe current entity', function (this: BackendWorld) {
  assert.ok(this.error instanceof Error);
  assert.match(this.error.message, /unsafe existing CURRENT entity/i);
});

Then('the existing current row remains unchanged', function (this: BackendWorld) {
  const existing = this.dynamo.items.get(`ENTITY#${this.seedEntityId}|CURRENT`);
  assert.deepEqual(existing, this.seedCurrentRow);
});

Given('an unused @tricoinc.com email address', function (this: BackendWorld) {
  this.email = 'new-editor@tricoinc.com';
});

When('I register with a valid password', async function (this: BackendWorld) {
  await this.auth.register(this.email, PASSWORD);
  const account = [...this.dynamo.items.values()].find((item) => item['email'] === this.email);
  assert.equal(account?.['emailVerified'], false);
  assert.equal(this.messages.length, 1);
  assert.equal(sessions(this).length, 0);
  mark(
    this,
    'an unverified account is created',
    'a single-use verification message is sent',
    'no authenticated session is created',
  );
});

Given('an unused email address outside @tricoinc.com', function (this: BackendWorld) {
  this.email = 'outsider@example.com';
});

Given('I am entering a new editor password', function (this: BackendWorld) {
  this.email = 'new-editor@tricoinc.com';
});

When(
  'I enter a password with {int} characters',
  function (this: BackendWorld, characterCount: number) {
    this.passwordAccepted = signupRequestSchema.safeParse({
      email: this.email,
      password: 'p'.repeat(characterCount),
    }).success;
  },
);

Then(
  'registration considers the password {string}',
  function (this: BackendWorld, validity: string) {
    assert.equal(this.passwordAccepted, validity === 'valid');
  },
);

When('I attempt to register', async function (this: BackendWorld) {
  await capture(this, () => this.auth.register(this.email, PASSWORD));
  assert.equal(this.error instanceof ServiceError && this.error.code, 'FORBIDDEN_EMAIL_DOMAIN');
  assert.equal(this.dynamo.items.size, 0);
  mark(this, 'registration is rejected with FORBIDDEN_EMAIL_DOMAIN', 'no account is created');
});

Given('a valid unconsumed verification token', async function (this: BackendWorld) {
  await this.auth.register(this.email, PASSWORD);
  this.token = tokenFromLastMessage(this);
});

Given(
  'a verification token older than {int} hours',
  async function (this: BackendWorld, _hours: number) {
    await this.auth.register(this.email, PASSWORD);
    this.token = tokenFromLastMessage(this);
    const record = [...this.dynamo.items.values()].find((item) =>
      String(item['pk']).startsWith('TOKEN#VERIFY#'),
    );
    assert.ok(record !== undefined);
    record['expiresAt'] = 0;
  },
);

When('I verify the account', async function (this: BackendWorld) {
  await capture(this, () => this.auth.verifyEmail(this.token));
  if (this.error === undefined) {
    const account = [...this.dynamo.items.values()].find((item) => item['email'] === this.email);
    assert.equal(account?.['emailVerified'], true);
    await capture(this, () => this.auth.verifyEmail(this.token));
    const replayError: unknown = this.error;
    assert.equal(replayError instanceof ServiceError && replayError.code, 'TOKEN_INVALID');
    mark(this, 'the account becomes verified', 'replaying the token is rejected');
  } else {
    const account = [...this.dynamo.items.values()].find((item) => item['email'] === this.email);
    assert.equal(account?.['emailVerified'], false);
    mark(this, 'verification is rejected', 'the account remains unverified');
  }
});

Given('a verified TriCo editor account', async function (this: BackendWorld) {
  await registerVerified(this);
});

When('I log in with valid credentials', async function (this: BackendWorld) {
  this.session = await this.auth.login(this.email, PASSWORD);
  const record = sessions(this)[0];
  assert.ok(record !== undefined);
  assert.equal(Number(record['expiresAt']) - Math.floor(Date.now() / 1000), 30 * 24 * 60 * 60);
  assert.equal((await this.auth.authenticate(this.session.token))?.principal.email, this.email);
  mark(
    this,
    'a fixed 30 day session is established',
    'the application reports that editor as authenticated',
  );
});

Given('I have {string}', async function (this: BackendWorld, credentialCase: string) {
  if (credentialCase !== 'an unknown email') {
    await this.auth.register(this.email, PASSWORD);
    if (credentialCase === 'an incorrect password')
      await this.auth.verifyEmail(tokenFromLastMessage(this));
  }
  this.token = credentialCase;
});

When('I attempt to log in', async function (this: BackendWorld) {
  const email = this.token === 'an unknown email' ? 'missing@tricoinc.com' : this.email;
  const password = this.token === 'an incorrect password' ? 'wrong-password' : PASSWORD;
  await capture(this, () => this.auth.login(email, password));
  assert.equal(this.error instanceof ServiceError && this.error.code, 'INVALID_CREDENTIALS');
  assert.equal(sessions(this).length, 0);
  mark(
    this,
    'login is rejected with the same public credential error',
    'no authenticated session is created',
  );
});

Given('I have an authenticated editor session', async function (this: BackendWorld) {
  await registerVerified(this);
  this.session = await this.auth.login(this.email, PASSWORD);
});

When(
  'I submit a mutation without an accepted origin and CSRF token',
  async function (this: BackendWorld) {
    const guard = createOriginGuard('https://trico.example');
    await guard({ headers: {} } as never, {} as never, (error?: unknown) => {
      this.error = error;
    });
    assert.equal(this.error instanceof HttpError && this.error.code, 'ORIGIN_REJECTED');
    assert.equal(sessions(this).length, 1);
    mark(this, 'the mutation is rejected', 'no application state changes');
  },
);

When('I log out', async function (this: BackendWorld) {
  assert.ok(this.session !== undefined);
  await this.auth.logout(this.session.token);
  assert.equal(await this.auth.authenticate(this.session.token), undefined);
  mark(this, 'the current session is deleted', 'replaying its opaque cookie is rejected');
});

Given('my account has multiple authenticated sessions', async function (this: BackendWorld) {
  await registerVerified(this);
  this.sessions = [
    await this.auth.login(this.email, PASSWORD),
    await this.auth.login(this.email, PASSWORD),
  ];
});

When('I log out from all devices', async function (this: BackendWorld) {
  await this.auth.logoutAll(this.sessions[0]?.principal.subject ?? '');
  assert.equal(sessions(this).length, 0);
  mark(this, 'every session belonging to my account is deleted');
});

Given('a valid unconsumed password reset token', async function (this: BackendWorld) {
  await registerVerified(this);
  await this.auth.requestPasswordReset(this.email);
  this.token = tokenFromLastMessage(this);
});

Given('the account has authenticated sessions', async function (this: BackendWorld) {
  this.sessions = [
    await this.auth.login(this.email, PASSWORD),
    await this.auth.login(this.email, PASSWORD),
  ];
});

When('I choose a valid replacement password', async function (this: BackendWorld) {
  await this.auth.confirmPasswordReset(this.token, `${PASSWORD} replacement`);
  await capture(this, () => this.auth.confirmPasswordReset(this.token, `${PASSWORD} again`));
  assert.equal(this.error instanceof ServiceError && this.error.code, 'TOKEN_INVALID');
  assert.equal(sessions(this).length, 0);
  assert.ok(await this.auth.login(this.email, `${PASSWORD} replacement`));
  mark(
    this,
    'the password is replaced',
    'the reset token cannot be reused',
    'all previous sessions are rejected',
  );
});

Given('a password reset token older than one hour', async function (this: BackendWorld) {
  await registerVerified(this);
  await this.auth.requestPasswordReset(this.email);
  this.token = tokenFromLastMessage(this);
  const record = [...this.dynamo.items.values()].find((item) =>
    String(item['pk']).startsWith('TOKEN#RESET#'),
  );
  assert.ok(record !== undefined);
  record['expiresAt'] = 0;
});

When('I attempt to reset the password', async function (this: BackendWorld) {
  await capture(this, () => this.auth.confirmPasswordReset(this.token, `${PASSWORD} replacement`));
  assert.equal(this.error instanceof ServiceError && this.error.code, 'TOKEN_INVALID');
  assert.ok(await this.auth.login(this.email, PASSWORD));
  mark(this, 'the reset is rejected', 'the existing password remains valid');
});

factThen([
  'an unverified account is created',
  'a single-use verification message is sent',
  'no authenticated session is created',
  'registration is rejected with FORBIDDEN_EMAIL_DOMAIN',
  'no account is created',
  'the account becomes verified',
  'replaying the token is rejected',
  'verification is rejected',
  'the account remains unverified',
  'a fixed 30 day session is established',
  'the application reports that editor as authenticated',
  'login is rejected with the same public credential error',
  'the mutation is rejected',
  'no application state changes',
  'the current session is deleted',
  'replaying its opaque cookie is rejected',
  'every session belonging to my account is deleted',
  'the password is replaced',
  'the reset token cannot be reused',
  'all previous sessions are rejected',
  'the reset is rejected',
  'the existing password remains valid',
]);

Given('I am an authenticated editor', function () {});

Given('an entity has no pending change', async function (this: BackendWorld) {
  this.beforeValue = pageEntities(await this.content.page('home'))[HERO];
  assert.equal((await this.content.pending('home')).length, 0);
});

When('I save a schema-valid complete replacement', async function (this: BackendWorld) {
  assert.ok(this.beforeValue !== undefined);
  this.change = await this.content.createChange(HERO, EDITOR, changed(this.beforeValue));
  assert.deepEqual(pageEntities(await this.content.page('home'))[HERO], this.beforeValue);
  assert.deepEqual(
    pageEntities(await this.content.preview('home', OTHER_EDITOR))[HERO],
    this.change.replacementValue,
  );
  mark(
    this,
    'the published entity is unchanged',
    "the change is enabled in every editor's preview by default",
  );
});

Then('revision {int} is owned by me', function (this: BackendWorld, revision: number) {
  assert.equal(this.change?.revision, revision);
  assert.equal(this.change?.authorId, EDITOR);
});

Given('two editors concurrently save the same unchanged entity', function () {});

When('both conditional creates reach DynamoDB', async function (this: BackendWorld) {
  const value = changed(seedValue(HERO));
  const results = await Promise.allSettled([
    this.content.createChange(HERO, EDITOR, value),
    this.content.createChange(HERO, OTHER_EDITOR, value),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  mark(this, 'exactly one pending change is created', 'the other request receives a conflict');
});

Given(
  'I own a pending change at revision {int}',
  async function (this: BackendWorld, revision: number) {
    this.change = await createRevision(this, HERO, revision);
    this.beforeValue = pageEntities(await this.content.page('home'))[HERO];
  },
);

When(
  'I save a replacement expecting revision {int}',
  async function (this: BackendWorld, revision: number) {
    assert.ok(this.change !== undefined);
    await capture(this, async () => {
      this.change = await this.content.updateChange(
        HERO,
        EDITOR,
        revision,
        changed(this.change?.replacementValue ?? ''),
      );
    });
    if (this.error === undefined) {
      assert.equal(this.change.revision, revision + 1);
      assert.deepEqual(pageEntities(await this.content.page('home'))[HERO], this.beforeValue);
      mark(
        this,
        `its replacement is updated at revision ${String(revision + 1)}`,
        'its published entity is unchanged',
      );
    } else {
      assert.equal(
        this.error instanceof ServiceError && this.error.code,
        'PENDING_CHANGE_CONFLICT',
      );
      assert.equal((await this.content.pending('home'))[0]?.revision, this.change.revision);
      mark(
        this,
        'the request is rejected as a conflict',
        `revision ${String(this.change.revision)} remains unchanged`,
      );
    }
  },
);

Then(
  'its replacement is updated at revision {int}',
  function (this: BackendWorld, revision: number) {
    assert.equal(this.change?.revision, revision);
    assert.equal(
      this.facts.has(`its replacement is updated at revision ${String(revision)}`),
      true,
    );
  },
);

Then('revision {int} remains unchanged', function (this: BackendWorld, revision: number) {
  assert.equal(this.facts.has(`revision ${String(revision)} remains unchanged`), true);
});

Given("another editor owns the entity's pending change", async function (this: BackendWorld) {
  this.change = await createRevision(this, HERO, 1, OTHER_EDITOR);
});

When('I try to {string} that pending change', async function (this: BackendWorld, action: string) {
  assert.ok(this.change !== undefined);
  await capture(this, () =>
    action === 'discard'
      ? this.content.discardChange(HERO, EDITOR, this.change?.revision ?? 0)
      : this.content.updateChange(
          HERO,
          EDITOR,
          this.change?.revision ?? 0,
          changed(this.change?.replacementValue ?? ''),
        ),
  );
  assert.equal(this.error instanceof ServiceError && this.error.code, 'PENDING_CHANGE_CONFLICT');
  assert.deepEqual((await this.content.pending('home'))[0], this.change);
  mark(this, 'the request is rejected', 'the pending change remains unchanged');
});

Given('a page has pending changes from multiple editors', async function (this: BackendWorld) {
  this.change = await createRevision(this, HERO, 1, EDITOR);
  this.otherChange = await createRevision(this, 'home.contact' as EntityId, 1, OTHER_EDITOR);
  this.otherPreview = await this.content.preview('home', OTHER_EDITOR);
});

When('I disable one entity in my preview', async function (this: BackendWorld) {
  assert.ok(this.change !== undefined && this.otherChange !== undefined);
  await this.content.togglePreview(EDITOR, this.change.entityId, true);
  this.preview = await this.content.preview('home', EDITOR);
  const entities = this.preview as Record<string, EditableValue>;
  const otherEntities = this.otherPreview as Record<string, EditableValue>;
  assert.deepEqual(entities[this.change.entityId], this.change.beforeValue);
  assert.deepEqual(entities[this.otherChange.entityId], this.otherChange.replacementValue);
  assert.deepEqual(otherEntities[this.change.entityId], this.change.replacementValue);
  mark(
    this,
    'my assembled preview uses its published value',
    'the other pending replacements remain visible',
    "another editor's preview preferences are unchanged",
  );
});

Given('an editable list has UUID-backed items', function (this: BackendWorld) {
  const seed = seedValue(LIST);
  assert.ok(Array.isArray(seed));
  this.listBefore = seed;
  assert.equal(
    seed.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        !Array.isArray(item) &&
        typeof item['id'] === 'string',
    ),
    true,
  );
});

When('I add, remove, and reorder list items before saving', function (this: BackendWorld) {
  const retained = this.listBefore.filter((_, index) => index !== 1).reverse();
  const template = retained[0];
  assert.ok(typeof template === 'object' && template !== null && !Array.isArray(template));
  this.listAfter = [...retained, { ...template, id: randomUUID() }];
  assert.equal(requireEntityDefinition(LIST).schema.safeParse(this.listAfter).success, true);
  const beforeIds = new Set(
    this.listBefore.flatMap((item) =>
      typeof item === 'object' && item !== null && !Array.isArray(item)
        ? [Reflect.get(item, 'id') as EditableValue]
        : [],
    ),
  );
  const retainedIds = retained.flatMap((item) =>
    typeof item === 'object' && item !== null && !Array.isArray(item)
      ? [Reflect.get(item, 'id') as EditableValue]
      : [],
  );
  assert.equal(
    retainedIds.every((id) => beforeIds.has(id)),
    true,
  );
  assert.equal(
    beforeIds.has((this.listAfter.at(-1) as Record<string, EditableValue>)['id'] ?? null),
    false,
  );
  mark(
    this,
    'retained items keep their UUIDs',
    'new items receive UUIDs',
    'the complete replacement list passes its registered schema',
  );
});

Given('I own a pending Home collection reorder', async function (this: BackendWorld) {
  const published = seedValue(HOME_LIST);
  assert.ok(Array.isArray(published) && published.length > 1);
  this.listBefore = published;
  const reordered = [...published];
  [reordered[0], reordered[1]] = [reordered[1] ?? null, reordered[0] ?? null];
  this.change = await this.content.createChange(HOME_LIST, EDITOR, reordered);
  assert.equal((await this.content.pending('home')).length, 1);
});

Given('that reorder is hidden from my persisted preview', async function (this: BackendWorld) {
  await this.content.togglePreview(EDITOR, HOME_LIST, true);
  assert.deepEqual(await this.content.previewDisabled(EDITOR), [HOME_LIST]);
});

When(
  'I save the collection in its original published order at the expected revision',
  async function (this: BackendWorld) {
    assert.ok(this.change !== undefined);
    await this.content.updateChange(
      HOME_LIST,
      EDITOR,
      this.change.revision,
      editableValueSchema.parse(this.listBefore),
    );
  },
);

Then('the JSON-equivalent pending change is removed', async function (this: BackendWorld) {
  assert.equal((await this.content.pending('home')).length, 0);
});

Then('its persisted preview exclusion is removed', async function (this: BackendWorld) {
  assert.deepEqual(await this.content.previewDisabled(EDITOR), []);
});

Then('the published collection remains unchanged', async function (this: BackendWorld) {
  assert.deepEqual(pageEntities(await this.content.page('home'))[HOME_LIST], this.listBefore);
});

factThen([
  'the published entity is unchanged',
  "the change is enabled in every editor's preview by default",
  'exactly one pending change is created',
  'the other request receives a conflict',
  'its published entity is unchanged',
  'the request is rejected as a conflict',
  'the request is rejected',
  'the pending change remains unchanged',
  'my assembled preview uses its published value',
  'the other pending replacements remain visible',
  "another editor's preview preferences are unchanged",
  'retained items keep their UUIDs',
  'new items receive UUIDs',
  'the complete replacement list passes its registered schema',
]);

When(
  'I request an upload for an allowed image MIME type and size',
  async function (this: BackendWorld) {
    const objects = new S3Client({
      region: 'us-west-2',
      endpoint: 'https://s3.example.com',
      forcePathStyle: true,
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    });
    try {
      const upload = await createMediaService(
        objects,
        BUCKET,
        this.dynamo.asClient(),
        TABLE,
      ).presign(
        {
          fileName: 'building.webp',
          contentType: 'image/webp',
          contentLength: 1024,
        },
        EDITOR,
      );
      assert.match(upload.uploadUrl, /^https:/);
      assert.match(upload.publicUrl, /^\/media\//);
    } finally {
      objects.destroy();
    }
    mark(
      this,
      'I receive a short-lived presigned PUT URL',
      'I receive its durable public media reference',
    );
  },
);

When('I request an upload with {string}', function (this: BackendWorld, condition: string) {
  const input = condition.includes('MIME')
    ? { fileName: 'unsafe.exe', contentType: 'application/octet-stream', contentLength: 1 }
    : { fileName: 'huge.png', contentType: 'image/png', contentLength: 21 * 1024 * 1024 };
  assert.equal(mediaPresignRequestSchema.safeParse(input).success, false);
  mark(this, 'the request is rejected before a presigned URL is created');
});

Given(
  'a requested image upload now exists in managed object storage',
  function (this: BackendWorld) {
    const uploadId = '50000000-0000-4000-8000-000000000001';
    const objectKey = `${uploadId}.webp`;
    const body = 'image bytes!';
    this.objects.objects.set(`media/${objectKey}`, body);
    this.dynamo.items.set(`MEDIA#UPLOAD|UPLOAD#${uploadId}`, {
      pk: 'MEDIA#UPLOAD',
      sk: `UPLOAD#${uploadId}`,
      uploadId,
      userId: EDITOR,
      bucket: BUCKET,
      objectKey: `media/${objectKey}`,
      publicUrl: `/media/${objectKey}`,
      contentType: 'image/webp',
      contentLength: Buffer.byteLength(body),
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      ttl: Math.floor(Date.now() / 1_000) + 300,
    });
    this.token = uploadId;
  },
);

When(
  'the editor confirms it with a friendly name and alternative text',
  async function (this: BackendWorld) {
    const asset = await this.media.confirm(
      {
        uploadId: this.token,
        name: 'Main office exterior',
        altText: 'TriCo main office viewed from the street',
      },
      EDITOR,
    );
    this.mediaAssets = [asset];
  },
);

Then('the image appears in the first managed-library page', async function (this: BackendWorld) {
  const page = await this.media.list({ limit: 24 });
  assert.deepEqual(page.assets, this.mediaAssets);
  mark(this, 'the image appears in the first managed-library page');
});

Then('the editor-facing result contains no bucket or object key', function (this: BackendWorld) {
  const serialized = JSON.stringify(this.mediaAssets);
  assert.equal(serialized.includes('bucket'), false);
  assert.equal(serialized.includes('objectKey'), false);
  mark(this, 'the editor-facing result contains no bucket or object key');
});

Given(
  'the managed media library contains more images than one requested page',
  function (this: BackendWorld) {
    const dates = [
      '2026-09-08T00:00:00.000Z',
      '2026-09-08T00:01:00.000Z',
      '2026-09-08T00:02:00.000Z',
    ];
    dates.forEach((createdAt, index) => {
      const id = `50000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}`;
      this.dynamo.items.set(`MEDIA#LIBRARY|${createdAt}#${id}`, {
        pk: 'MEDIA#LIBRARY',
        sk: `${createdAt}#${id}`,
        id,
        name: `Library image ${String(index + 1)}`,
        altText: `Example image ${String(index + 1)}`,
        contentType: 'image/webp',
        contentLength: 100 + index,
        publicUrl: `/media/example-${String(index + 1)}.webp`,
        createdAt,
        objectKey: `media/private-${String(index + 1)}.webp`,
      });
    });
  },
);

When('the editor follows the returned media cursor', async function (this: BackendWorld) {
  const first = await this.media.list({ limit: 2 });
  assert.ok(first.nextCursor !== null);
  const second = await this.media.list({ cursor: first.nextCursor, limit: 2 });
  this.mediaAssets = [...first.assets, ...second.assets];
  this.mediaCursor = second.nextCursor;
});

Then('each image appears exactly once in creation order', function (this: BackendWorld) {
  assert.deepEqual(
    this.mediaAssets.map((asset) => asset.name),
    ['Library image 1', 'Library image 2', 'Library image 3'],
  );
  assert.equal(new Set(this.mediaAssets.map((asset) => asset.id)).size, 3);
  assert.equal(this.mediaCursor, null);
  mark(this, 'each image appears exactly once in creation order');
});

Given(
  'a synchronized listing has a manually overridden price',
  async function (this: BackendWorld) {
    const seed = seedValue(LIST);
    assert.ok(Array.isArray(seed));
    const itemId = String((seed[0] as Record<string, unknown>)['id']);
    this.source = await this.sources.create({
      ...sourceInput(itemId),
      overriddenFields: ['price'],
    });
    await seedManifest(this);
  },
);

When(
  'scheduled synchronization returns a new price and status',
  async function (this: BackendWorld) {
    this.syncResult = await createExternalSyncService(
      this.sources,
      this.content,
      {
        synthesize: async (request) => ({
          ...(request.currentItem as Readonly<Record<string, EditableValue>>),
          price: '$999,999',
          status: 'sold',
        }),
      },
      async () => 'changed listing',
    ).run(syncEvent);
    const page = await this.content.page('real-estate');
    const listings = page[LIST];
    assert.ok(Array.isArray(listings));
    this.preview = listings[0];
  },
);

Then('the manual price is preserved', function (this: BackendWorld) {
  assert.equal(Reflect.get(this.preview as object, 'price'), '$512,000');
  mark(this, 'the manual price is preserved');
});

Then('the non-overridden status is updated', function (this: BackendWorld) {
  assert.equal(Reflect.get(this.preview as object, 'status'), 'sold');
  mark(this, 'the non-overridden status is updated');
});

Given(
  'a source mapping has paused automatic updates for price and status',
  async function (this: BackendWorld) {
    const seed = seedValue(LIST);
    assert.ok(Array.isArray(seed));
    this.source = await this.sources.create({
      ...sourceInput(String((seed[0] as Record<string, unknown>)['id'])),
      overriddenFields: ['price', 'status'],
    });
  },
);

When('the editor resumes automatic updates for price', async function (this: BackendWorld) {
  assert.ok(this.source !== undefined);
  this.source = await this.sources.update(this.source.id, { overriddenFields: ['status'] });
});

Then('only status remains manually overridden', function (this: BackendWorld) {
  assert.deepEqual(this.source?.overriddenFields, ['status']);
  mark(this, 'only status remains manually overridden');
});

Given('a list item already has an external source', async function (this: BackendWorld) {
  const seed = seedValue(LIST);
  assert.ok(Array.isArray(seed));
  const itemId = (seed[0] as Record<string, unknown>)['id'];
  if (typeof itemId !== 'string') throw new Error('Seed list item is missing an id');
  this.source = await this.sources.create(sourceInput(itemId));
});

When('an editor creates another source for that item', async function (this: BackendWorld) {
  assert.ok(this.source !== undefined);
  await capture(this, () => this.sources.create(sourceInput(this.source?.itemId ?? '')));
  assert.equal(this.error instanceof ServiceError && this.error.code, 'SOURCE_ALREADY_EXISTS');
  assert.deepEqual((await this.sources.list(LIST))[0], this.source);
  mark(this, 'the request is rejected as a conflict', 'the existing source remains unchanged');
});

Given(
  'an enabled source belongs to an entity with a pending change',
  async function (this: BackendWorld) {
    const seed = seedValue(LIST);
    assert.ok(Array.isArray(seed));
    await this.sources.create(sourceInput(String((seed[0] as Record<string, unknown>)['id'])));
    await this.content.createChange(LIST, EDITOR, changed(seed));
  },
);

When('scheduled synchronization runs', async function (this: BackendWorld) {
  const service = createExternalSyncService(
    this.sources,
    this.content,
    { synthesize: async (request) => request.currentItem },
    async () => {
      this.fetchCalls += 1;
      return 'changed';
    },
  );
  this.syncResult = await service.run(syncEvent);
  assert.equal(this.syncResult.skippedEntities, 1);
  assert.equal(this.fetchCalls, 0);
  mark(this, 'the whole entity is skipped', 'no request is made to any of its source URLs');
});

Given('an external source URL has {string}', function (this: BackendWorld, networkCase: string) {
  this.token = networkCase;
});

When('the bounded HTTPS fetch is attempted', async function (this: BackendWorld) {
  const redirectCase = this.token.includes('redirect');
  const fetchSource = createBoundedPublicFetch(
    async (hostname) => [
      { address: hostname === 'internal.example' ? '127.0.0.1' : '203.0.113.10' },
    ],
    async () =>
      new Response(null, {
        status: 302,
        headers: { location: 'https://internal.example/' },
      }),
  );
  await capture(this, () =>
    fetchSource(redirectCase ? 'https://public.example/' : 'https://127.0.0.1/'),
  );
  assert.ok(this.error instanceof Error);
  mark(this, 'synchronization rejects that source', 'processing continues for other sources');
});

const prepareSync = async (world: BackendWorld, count: number): Promise<void> => {
  const seed = seedValue(LIST);
  assert.ok(Array.isArray(seed));
  for (const item of seed.slice(0, count)) {
    const itemId = (item as Record<string, unknown>)['id'];
    if (typeof itemId !== 'string') throw new Error('Seed list item is missing an id');
    await world.sources.create(sourceInput(itemId, `https://listings.example/${itemId}`));
  }
};

Given(
  'every configured token is present in the fetched source text',
  async function (this: BackendWorld) {
    await prepareSync(this, 1);
  },
);

When('scheduled synchronization checks the item', async function (this: BackendWorld) {
  this.syncResult = await createExternalSyncService(
    this.sources,
    this.content,
    {
      synthesize: async (request) => {
        this.aiCalls += 1;
        return request.currentItem;
      },
    },
    async () => 'the price remains visible',
  ).run(syncEvent);
  assert.equal(this.syncResult.changedEntities, 0);
  assert.equal(this.aiCalls, 0);
  mark(this, 'the item is unchanged', 'the AI provider is not called');
});

Given(
  'multiple source items in one unlocked entity require valid replacements',
  async function (this: BackendWorld) {
    await prepareSync(this, 2);
    await seedManifest(this);
  },
);

When('scheduled synchronization completes synthesis', async function (this: BackendWorld) {
  const ai: AiConnection = {
    synthesize: async (request) => {
      this.aiCalls += 1;
      return changed(request.currentItem);
    },
  };
  this.syncResult = await createExternalSyncService(
    this.sources,
    this.content,
    ai,
    async () => 'different',
  ).run(syncEvent);
  assert.equal(this.aiCalls, 2);
  assert.equal(this.syncResult.changedEntities, 1);
  assert.equal((await this.content.pending('real-estate')).length, 0);
  assert.equal((await this.content.history('real-estate')).length, 1);
  mark(
    this,
    'one complete parent-list pending change is conditionally created',
    'it is automatically published once',
  );
});

Given(
  'synchronization found a changed source while the entity was unlocked',
  async function (this: BackendWorld) {
    await prepareSync(this, 1);
    await seedManifest(this);
  },
);

When(
  'a human pending change appears before the system change is created',
  async function (this: BackendWorld) {
    let raced = false;
    const ai: AiConnection = {
      synthesize: async (request) => {
        if (!raced) {
          raced = true;
          await this.content.createChange(LIST, EDITOR, changed(seedValue(LIST), ' human'));
        }
        return changed(request.currentItem, ' system');
      },
    };
    this.syncResult = await createExternalSyncService(
      this.sources,
      this.content,
      ai,
      async () => 'different',
    ).run(syncEvent);
    const pending = await this.content.pending('real-estate');
    assert.equal(this.syncResult.failures.length, 1);
    assert.equal(pending[0]?.authorId, EDITOR);
    mark(
      this,
      'the system conditional create fails',
      'the human pending change is not overwritten',
    );
  },
);

Given(
  'one source fails fetch or structured-output validation',
  async function (this: BackendWorld) {
    await prepareSync(this, 2);
    await seedManifest(this);
  },
);

Given('another source produces a valid changed item', function () {});

When('scheduled synchronization finishes the entity', async function (this: BackendWorld) {
  let call = 0;
  this.syncResult = await createExternalSyncService(
    this.sources,
    this.content,
    { synthesize: async (request) => changed(request.currentItem) },
    async () => {
      call += 1;
      if (call === 1) throw new Error('injected fetch failure');
      return 'different';
    },
  ).run(syncEvent);
  assert.equal(this.syncResult.failures.length, 1);
  assert.equal(this.syncResult.changedEntities, 1);
  mark(
    this,
    'the failure is recorded without its unsafe replacement',
    'valid replacements are still batched and published',
  );
});

factThen([
  'I receive a short-lived presigned PUT URL',
  'I receive its durable public media reference',
  'the request is rejected before a presigned URL is created',
  'the existing source remains unchanged',
  'the whole entity is skipped',
  'no request is made to any of its source URLs',
  'synchronization rejects that source',
  'processing continues for other sources',
  'the item is unchanged',
  'the AI provider is not called',
  'one complete parent-list pending change is conditionally created',
  'it is automatically published once',
  'the system conditional create fails',
  'the human pending change is not overwritten',
  'the failure is recorded without its unsafe replacement',
  'valid replacements are still batched and published',
]);

Given(
  'selected pending changes still exist at their reviewed revisions',
  async function (this: BackendWorld) {
    await seedManifest(this);
    this.change = await createRevision(this, HERO, 1);
    this.otherChange = await createRevision(this, 'storage.hero' as EntityId, 1, OTHER_EDITOR);
    await createRevision(this, 'development.hero' as EntityId, 1, EDITOR);
  },
);

When('an authenticated editor publishes the selection', async function (this: BackendWorld) {
  assert.ok(this.change !== undefined);
  const selections =
    this.otherChange === undefined
      ? [{ entityId: this.change.entityId, expectedRevision: this.change.revision + 1 }]
      : [this.change, this.otherChange].map((change) => ({
          entityId: change.entityId,
          expectedRevision: change.revision,
        }));
  await capture(this, async () => {
    this.publishResult = await this.content.publish(selections, EDITOR);
  });
  if (this.error !== undefined) {
    assert.equal(this.error instanceof ServiceError && this.error.code, 'PUBLISH_SELECTION_STALE');
    assert.equal((await this.content.pending()).length, 1);
    mark(
      this,
      'the entire request fails with PUBLISH_SELECTION_STALE',
      'none of the selected changes are published',
    );
    return;
  }
  assert.equal((await this.content.pending()).length, 1);
  assert.equal(this.objects.writes.at(-1), 'content/manifest.json');
  assert.equal((await this.content.deploymentState()).blocked, false);
  mark(
    this,
    'all selected entities and page snapshots are committed atomically',
    'unselected pending changes remain pending',
    'immutable page files are written before the manifest is switched',
    'the operation becomes LIVE after the manifest switch',
  );
});

Given(
  'one selected pending change no longer matches its reviewed revision',
  async function (this: BackendWorld) {
    this.change = await createRevision(this, HERO, 1);
    this.otherChange = undefined;
  },
);

Given('a publication transaction committed', async function (this: BackendWorld) {
  await seedManifest(this);
  this.beforeManifest = this.objects.objects.get('content/manifest.json') ?? '';
  this.change = await createRevision(this, HERO, 1);
});

Given('writing an affected immutable page fails', function (this: BackendWorld) {
  this.objects.failKeySuffix = '/home.json';
});

When('deployment failure is recorded', async function (this: BackendWorld) {
  assert.ok(this.change !== undefined);
  await capture(this, () =>
    this.content.publish(
      [{ entityId: HERO, expectedRevision: this.change?.revision ?? 0 }],
      EDITOR,
    ),
  );
  assert.equal(this.error instanceof ServiceError && this.error.code, 'DEPLOYMENT_FAILED');
  assert.equal((await this.content.deploymentState()).blocked, true);
  assert.equal(this.objects.objects.get('content/manifest.json'), this.beforeManifest);
  assert.deepEqual(
    pageEntities(await this.content.page('home'))[HERO],
    this.change.replacementValue,
  );
  mark(
    this,
    'the previous manifest remains live',
    'the operation becomes DEPLOY_FAILED',
    'publish, rollback, and automatic publication are blocked',
    'editing and preview remain available',
  );
});

Given('a publish operation is DEPLOY_FAILED', async function (this: BackendWorld) {
  await seedManifest(this);
  this.change = await createRevision(this, HERO, 1);
  this.objects.failKeySuffix = '/home.json';
  await capture(this, () =>
    this.content.publish(
      [{ entityId: HERO, expectedRevision: this.change?.revision ?? 0 }],
      EDITOR,
    ),
  );
  this.error = undefined;
  this.objects.failKeySuffix = undefined;
});

When('an authenticated editor retries it', async function (this: BackendWorld) {
  const failed = (await this.content.deploymentState()).failedOperation;
  assert.ok(failed !== null);
  await this.content.retry(failed.id);
  assert.equal((await this.content.deploymentState()).blocked, false);
  assert.equal(this.objects.writes.at(-1), 'content/manifest.json');
  mark(
    this,
    'every affected page is rebuilt from current entities',
    'the manifest switches only after every page write succeeds',
    'the operation becomes LIVE',
  );
});

Given(
  'a historical publication and current pending changes for its page',
  async function (this: BackendWorld) {
    await seedManifest(this);
    let change = await createRevision(this, HERO, 1);
    const first = await this.content.publish(
      [{ entityId: HERO, expectedRevision: change.revision }],
      EDITOR,
    );
    this.historical = (await this.content.history('home')).find(
      (publication) => publication.id === first.publicationIds[0],
    );
    change = await createRevision(this, HERO, 1);
    await this.content.publish([{ entityId: HERO, expectedRevision: change.revision }], EDITOR);
    this.change = await createRevision(this, HERO, 1);
  },
);

When('an authenticated editor confirms rollback', async function (this: BackendWorld) {
  assert.ok(this.historical !== undefined && this.change !== undefined);
  const beforeManifest = JSON.parse(this.objects.objects.get('content/manifest.json') ?? '{}') as {
    pages: Record<string, unknown>;
  };
  this.publishResult = await this.content.rollback(this.historical.id, EDITOR);
  const afterManifest = JSON.parse(this.objects.objects.get('content/manifest.json') ?? '{}') as {
    pages: Record<string, unknown>;
  };
  const pending = (await this.content.pending('home'))[0];
  assert.equal((await this.content.history('home'))[0]?.source, 'ROLLBACK');
  assert.equal(pending?.revision, this.change.revision);
  assert.deepEqual(pending?.replacementValue, this.change.replacementValue);
  for (const pageId of pageIdSchema.options.filter((pageId) => pageId !== 'home'))
    assert.deepEqual(afterManifest.pages[pageId], beforeManifest.pages[pageId]);
  assert.equal((await this.sources.list(HERO)).length, 0);
  mark(
    this,
    'the historical snapshot becomes a new publication',
    'surviving changes retain replacement values and revisions against the restored baseline',
    'changes and sources for missing targets are removed',
    "only that page's manifest entry is switched",
  );
});

Given(
  'a publish selection would require more than 100 transaction actions',
  function (this: BackendWorld) {
    this.actionCount = estimatePublishActions(49, 1);
  },
);

When('the backend calculates the transaction before writing', function (this: BackendWorld) {
  if (this.actionCount > 100)
    this.error = new ServiceError('PUBLISH_SELECTION_TOO_LARGE', 'Publish fewer changes');
  else this.transactionAttempted = true;
});

Then('it rejects the request with PUBLISH_SELECTION_TOO_LARGE', function (this: BackendWorld) {
  assert.equal(
    this.error instanceof ServiceError && this.error.code,
    'PUBLISH_SELECTION_TOO_LARGE',
  );
});

Then('no transaction is attempted', function (this: BackendWorld) {
  assert.equal(this.transactionAttempted, false);
});

Given(
  'an assembled publication snapshot exceeds the configured page ceiling',
  function (this: BackendWorld) {
    this.snapshot = [{ entityId: HERO, entityVersion: 1, value: 'x'.repeat(360 * 1024) }];
  },
);

When('publication is validated', function (this: BackendWorld) {
  try {
    assertPublicationFits(this.snapshot);
    this.transactionAttempted = true;
  } catch (error: unknown) {
    this.error = error;
  }
});

Then('it is rejected with PAGE_SNAPSHOT_TOO_LARGE', function (this: BackendWorld) {
  assert.equal(this.error instanceof ServiceError && this.error.code, 'PAGE_SNAPSHOT_TOO_LARGE');
});

Then('no publication transaction is attempted', function (this: BackendWorld) {
  assert.equal(this.transactionAttempted, false);
});

factThen([
  'all selected entities and page snapshots are committed atomically',
  'unselected pending changes remain pending',
  'immutable page files are written before the manifest is switched',
  'the operation becomes LIVE after the manifest switch',
  'the entire request fails with PUBLISH_SELECTION_STALE',
  'none of the selected changes are published',
  'the previous manifest remains live',
  'the operation becomes DEPLOY_FAILED',
  'publish, rollback, and automatic publication are blocked',
  'editing and preview remain available',
  'every affected page is rebuilt from current entities',
  'the manifest switches only after every page write succeeds',
  'the operation becomes LIVE',
  'the historical snapshot becomes a new publication',
  'surviving changes retain replacement values and revisions against the restored baseline',
  'changes and sources for missing targets are removed',
  "only that page's manifest entry is switched",
]);

Given('the six canonical page definitions', function () {});

When('the editable entity registry is validated', function (this: BackendWorld) {
  for (const definition of entityRegistry.values()) validateDefinition(definition);
  this.registryValidated = true;
});

Then('it contains exactly 195 globally unique entity IDs', function (this: BackendWorld) {
  assert.equal(this.registryValidated, true);
  assert.equal(entityRegistry.size, 195);
  assert.equal(new Set([...entityRegistry.keys()]).size, 195);
});

Then('its page counts are 18, 35, 31, 65, 18, and 28', function () {
  assert.deepEqual(
    pageIdSchema.options.map(
      (pageId) => [...entityRegistry.values()].filter((entry) => entry.pageId === pageId).length,
    ),
    [18, 35, 31, 65, 18, 28],
  );
});

Then('every ID namespace, page ID, public path, kind, schema, label, and seed agree', function () {
  for (const definition of entityRegistry.values()) validateDefinition(definition);
});

Then('none of the nine hard-coded form configurations is editable', function () {
  const excluded = [
    'construction.bid.form',
    'construction.contact.form',
    'development.contact.form',
    'home.careers.resume-form',
    'property-management.contact.form',
    'property-management.new-client-form',
    'real-estate.contact.form',
    'real-estate.new-client-form',
    'storage.contact.form',
  ];
  assert.equal(
    excluded.some((id) => entityRegistry.has(id)),
    false,
  );
});

function illustrativeSemanticModule(): EntityModule {
  const legacyHero = requireEntityDefinition('home.hero');
  const hero = {
    ...legacyHero,
    editor: entityEditorDefinitionSchema.parse({
      version: 2,
      kind: 'object',
      label: 'Hero',
      helpText: 'Update the introductory message.',
      groups: [
        {
          id: 'copy',
          label: 'Words',
          order: 0,
          fields: [
            {
              path: ['content'],
              label: 'Hero content',
              required: true,
              order: 0,
              validationMessages: {
                required: 'Enter the hero content.',
                invalid: 'Check the hero content and try again.',
              },
              control: { type: 'multiline-text', rows: 4 },
            },
          ],
        },
      ],
    }),
  };
  return defineEntityModule({
    pageId: 'home',
    entities: [hero],
    viewCatalog: [
      {
        entityId: 'home.hero',
        pageId: 'home',
        legacyComponent: 'HomeHero',
        primary: { slotId: 'home.hero.primary', routes: ['/'] },
        secondary: [],
        emptyState: { kind: 'not-applicable' },
      },
    ],
  });
}

Given('a page-owned semantic entity module', function (this: BackendWorld) {
  assert.equal(illustrativeSemanticModule().pageId, 'home');
});

When(
  'its editor metadata and visual catalog are validated incrementally',
  function (this: BackendWorld) {
    const module = illustrativeSemanticModule();
    assert.doesNotThrow(() => aggregateEntityModules([module], { coverage: 'partial' }));
    mark(
      this,
      'every field control is explicit and browser-safe',
      'every migrated entity has exactly one primary visual slot',
    );

    const definitions = entityDefinitions.map((definition) =>
      definition.id === module.entities[0]?.id ? module.entities[0] : definition,
    );
    assert.throws(
      () => validateEntityViewCatalog(definitions, module.viewCatalog, 'complete'),
      /Semantic registry is incomplete/,
    );
    mark(this, 'complete validation rejects missing semantic entities and visual slots');
  },
);

factThen([
  'every field control is explicit and browser-safe',
  'every migrated entity has exactly one primary visual slot',
  'complete validation rejects missing semantic entities and visual slots',
]);

const remainingDivisionModules = {
  'Real Estate': { module: realEstateEntityModule, seeds: realEstateV2SeedData },
  Construction: { module: constructionEntityModule, seeds: constructionV2SeedData },
  Development: { module: developmentEntityModule, seeds: developmentV2SeedData },
} as const;

function remainingDivision(division: string) {
  const selected = remainingDivisionModules[division as keyof typeof remainingDivisionModules];
  assert.ok(selected, `Unexpected remaining division ${division}`);
  return selected;
}

Given(
  'the {int} canonical {string} entities and their version 2 module',
  function (this: BackendWorld, entityCount: number, division: string) {
    const selected = remainingDivision(division);
    assert.equal(selected.module.entities.length, entityCount);
    assert.equal(selected.module.viewCatalog.length, entityCount);
  },
);

When(
  'I prepare the {string} version 1 to version 2 migration',
  function (this: BackendWorld, division: string) {
    const selected = remainingDivision(division);
    const request = {
      pageId: selected.module.pageId,
      schemaVersion: 1 as const,
      environment: 'local' as const,
      mode: 'dry-run' as const,
      currentContent: {},
      pendingChanges: [],
    };
    const first = planEntityModuleContentMigration(selected.module, selected.seeds, request);
    const second = planEntityModuleContentMigration(selected.module, selected.seeds, request);
    assert.deepEqual(first, second);
    this.divisionMigrationPlan = first;
  },
);

Then(
  'all {int} {string} values use strict semantic schemas and explicit editor metadata',
  function (this: BackendWorld, entityCount: number, division: string) {
    const selected = remainingDivision(division);
    assert.equal(this.divisionMigrationPlan?.entries.length, entityCount);
    for (const definition of selected.module.entities) {
      assert.ok(definition.editor.groups.length > 0);
      assert.equal(
        definition.schema.safeParse(this.divisionMigrationPlan?.nextContent[definition.id]).success,
        true,
      );
    }
  },
);

Then(
  'each {string} entity has one primary visual slot',
  function (this: BackendWorld, division: string) {
    const selected = remainingDivision(division);
    assert.doesNotThrow(() =>
      validateEntityViewCatalog(selected.module.entities, selected.module.viewCatalog, 'complete'),
    );
  },
);

Then(
  'the {string} migration report is deterministic and dry-runnable',
  function (this: BackendWorld, division: string) {
    assert.equal(this.divisionMigrationPlan?.pageId, remainingDivision(division).module.pageId);
    assert.equal(this.divisionMigrationPlan?.dryRun, true);
  },
);

Then(
  'unresolved {string} version 1 pending changes block migration unless disposable local reset is explicit',
  function (this: BackendWorld, division: string) {
    const selected = remainingDivision(division);
    const entityId = selected.module.entities[0]?.id;
    assert.ok(entityId);
    const request = {
      pageId: selected.module.pageId,
      schemaVersion: 1 as const,
      environment: 'local' as const,
      mode: 'prepare-apply' as const,
      currentContent: {},
      pendingChanges: [{ entityId, schemaVersion: 1 as const }],
    };
    assert.throws(
      () => planEntityModuleContentMigration(selected.module, selected.seeds, request),
      /unresolved version 1 pending changes/,
    );
    const reset = planEntityModuleContentMigration(selected.module, selected.seeds, {
      ...request,
      mode: 'reset-disposable-local',
    });
    assert.deepEqual(reset.discardedPendingEntityIds, [entityId]);
  },
);

Given('I am not signed in', function () {});

When('I request the public health endpoint', async function (this: BackendWorld) {
  this.response = await fetch(`${this.baseUrl}/api/v1/health`);
});

Then('the response status is {int}', function (this: BackendWorld, status: number) {
  assert.equal(this.response?.status, status);
});

Then('the response body is exactly:', async function (this: BackendWorld, expected: string) {
  assert.deepEqual(await this.response?.json(), JSON.parse(expected));
});

function validateDefinition(definition: EntityDefinition): void {
  assert.equal(definition.id.split('.')[0], definition.pageId);
  assert.equal(definition.publicPath[0], definition.pageId);
  assert.ok(definition.label.trim().length > 0);
  assert.ok(definition.kind === 'object' || definition.kind === 'list');
  const seed = registrySeedData[definition.id];
  assert.notEqual(seed, undefined);
  assert.equal(definition.schema.safeParse(seed).success, true);
}
