import { createHash, randomBytes, randomUUID } from 'node:crypto';

import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import { hash, verify } from '@node-rs/argon2';
import type { AuthPrincipal } from '@app/schemas';

import type { MailConnection } from '../config/connections.js';
import { ServiceError } from './errors.js';

const SESSION_SECONDS = 30 * 24 * 60 * 60;
const VERIFY_SECONDS = 24 * 60 * 60;
const RESET_SECONDS = 60 * 60;

interface UserRecord {
  readonly pk: string;
  readonly sk: 'PROFILE';
  readonly userId: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly emailVerified: boolean;
}

interface SessionRecord {
  readonly pk: string;
  readonly sk: 'SESSION';
  readonly userId: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly csrfToken: string;
  readonly expiresAt: number;
}

export interface SessionCredentials {
  readonly token: string;
  readonly csrfToken: string;
  readonly principal: AuthPrincipal;
}

export interface AuthService {
  register(email: string, password: string): Promise<{ userId: string; email: string }>;
  verifyEmail(token: string): Promise<void>;
  login(email: string, password: string): Promise<SessionCredentials>;
  authenticate(token: string): Promise<SessionCredentials | undefined>;
  logout(token: string): Promise<void>;
  logoutAll(userId: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  confirmPasswordReset(token: string, password: string): Promise<void>;
}

const digest = (value: string): string => createHash('sha256').update(value).digest('hex');
const opaqueToken = (): string => randomBytes(32).toString('base64url');
const nowSeconds = (): number => Math.floor(Date.now() / 1_000);

const item = <T>(value: unknown): T => value as T;

export function createAuthService(
  database: DynamoDBDocumentClient,
  tableName: string,
  mail: MailConnection,
  publicOrigin: string,
): AuthService {
  const logoutAll = async (userId: string): Promise<void> => {
    const sessions = await database.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: 'gsi1',
        KeyConditionExpression: 'gsi1pk = :user',
        ExpressionAttributeValues: { ':user': `USER#${userId}` },
        ProjectionExpression: 'pk, sk',
      }),
    );
    await Promise.all(
      (sessions.Items ?? []).map(async (session) => {
        await database.send(
          new DeleteCommand({
            TableName: tableName,
            Key: { pk: session['pk'], sk: session['sk'] },
          }),
        );
      }),
    );
  };
  const storeToken = async (
    kind: 'VERIFY' | 'RESET',
    token: string,
    userId: string,
    lifetime: number,
  ): Promise<void> => {
    await database.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          pk: `TOKEN#${kind}#${digest(token)}`,
          sk: 'TOKEN',
          userId,
          expiresAt: nowSeconds() + lifetime,
        },
      }),
    );
  };

  const readUser = async (userId: string): Promise<UserRecord | undefined> => {
    const result = await database.send(
      new GetCommand({
        TableName: tableName,
        Key: { pk: `USER#${userId}`, sk: 'PROFILE' },
        ConsistentRead: true,
      }),
    );
    return result.Item === undefined ? undefined : item<UserRecord>(result.Item);
  };

  const userByEmail = async (email: string): Promise<UserRecord | undefined> => {
    const lookup = await database.send(
      new GetCommand({
        TableName: tableName,
        Key: { pk: `EMAIL#${email}`, sk: 'USER' },
        ConsistentRead: true,
      }),
    );
    const userId = lookup.Item?.['userId'];
    return typeof userId === 'string' ? readUser(userId) : undefined;
  };

  const consumeToken = async (kind: 'VERIFY' | 'RESET', token: string): Promise<string> => {
    const key = { pk: `TOKEN#${kind}#${digest(token)}`, sk: 'TOKEN' };
    const result = await database.send(
      new GetCommand({ TableName: tableName, Key: key, ConsistentRead: true }),
    );
    const userId = result.Item?.['userId'];
    const expiresAt = result.Item?.['expiresAt'];
    if (typeof userId !== 'string' || typeof expiresAt !== 'number' || expiresAt <= nowSeconds()) {
      throw new ServiceError('TOKEN_INVALID', 'The token is invalid or expired');
    }
    try {
      await database.send(
        new DeleteCommand({
          TableName: tableName,
          Key: key,
          ConditionExpression: 'attribute_exists(pk)',
        }),
      );
    } catch {
      throw new ServiceError('TOKEN_INVALID', 'The token is invalid or expired');
    }
    return userId;
  };

  const createSession = async (user: UserRecord): Promise<SessionCredentials> => {
    const token = opaqueToken();
    const csrfToken = opaqueToken();
    const createdAt = new Date().toISOString();
    await database.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          pk: `SESSION#${digest(token)}`,
          sk: 'SESSION',
          userId: user.userId,
          email: user.email,
          emailVerified: user.emailVerified,
          csrfToken,
          expiresAt: nowSeconds() + SESSION_SECONDS,
          gsi1pk: `USER#${user.userId}`,
          gsi1sk: `SESSION#${createdAt}`,
        },
      }),
    );
    return {
      token,
      csrfToken,
      principal: { subject: user.userId, email: user.email, emailVerified: user.emailVerified },
    };
  };

  return {
    register: async (email, password) => {
      if (!email.endsWith('@tricoinc.com')) {
        throw new ServiceError(
          'FORBIDDEN_EMAIL_DOMAIN',
          'Registration requires a @tricoinc.com email address',
        );
      }
      const userId = randomUUID();
      const verificationToken = opaqueToken();
      const passwordHash = await hash(password, {
        algorithm: 2,
        memoryCost: 65_536,
        timeCost: 3,
        parallelism: 1,
      });
      try {
        await database.send(
          new TransactWriteCommand({
            TransactItems: [
              {
                Put: {
                  TableName: tableName,
                  Item: { pk: `EMAIL#${email}`, sk: 'USER', userId },
                  ConditionExpression: 'attribute_not_exists(pk)',
                },
              },
              {
                Put: {
                  TableName: tableName,
                  Item: {
                    pk: `USER#${userId}`,
                    sk: 'PROFILE',
                    userId,
                    email,
                    passwordHash,
                    emailVerified: false,
                  },
                  ConditionExpression: 'attribute_not_exists(pk)',
                },
              },
            ],
          }),
        );
      } catch {
        throw new ServiceError(
          'EMAIL_ALREADY_REGISTERED',
          'An account already exists for this email',
        );
      }
      await storeToken('VERIFY', verificationToken, userId, VERIFY_SECONDS);
      await mail.send({
        to: email,
        subject: 'Verify your TriCo website account',
        text: `${publicOrigin}/verify-email?token=${encodeURIComponent(verificationToken)}`,
      });
      return { userId, email };
    },
    verifyEmail: async (token) => {
      const userId = await consumeToken('VERIFY', token);
      await database.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { pk: `USER#${userId}`, sk: 'PROFILE' },
          UpdateExpression: 'SET emailVerified = :verified',
          ExpressionAttributeValues: { ':verified': true },
          ConditionExpression: 'attribute_exists(pk)',
        }),
      );
    },
    login: async (email, password) => {
      const user = await userByEmail(email);
      if (user === undefined || !(await verify(user.passwordHash, password))) {
        throw new ServiceError('INVALID_CREDENTIALS', 'Email or password is incorrect');
      }
      if (!user.emailVerified) {
        throw new ServiceError('INVALID_CREDENTIALS', 'Email or password is incorrect');
      }
      return createSession(user);
    },
    authenticate: async (token) => {
      const sessionHash = digest(token);
      const result = await database.send(
        new GetCommand({
          TableName: tableName,
          Key: { pk: `SESSION#${sessionHash}`, sk: 'SESSION' },
          ConsistentRead: true,
        }),
      );
      if (result.Item === undefined) return undefined;
      const session = item<SessionRecord>(result.Item);
      if (session.expiresAt <= nowSeconds()) return undefined;
      return {
        token,
        csrfToken: session.csrfToken,
        principal: {
          subject: session.userId,
          email: session.email,
          emailVerified: session.emailVerified,
        },
      };
    },
    logout: async (token) => {
      await database.send(
        new DeleteCommand({
          TableName: tableName,
          Key: { pk: `SESSION#${digest(token)}`, sk: 'SESSION' },
        }),
      );
    },
    logoutAll,
    requestPasswordReset: async (email) => {
      const user = await userByEmail(email);
      if (user === undefined) return;
      const resetToken = opaqueToken();
      await storeToken('RESET', resetToken, user.userId, RESET_SECONDS);
      await mail.send({
        to: email,
        subject: 'Reset your TriCo website password',
        text: `${publicOrigin}/reset-password?token=${encodeURIComponent(resetToken)}`,
      });
    },
    confirmPasswordReset: async (token, password) => {
      const userId = await consumeToken('RESET', token);
      const passwordHash = await hash(password, {
        algorithm: 2,
        memoryCost: 65_536,
        timeCost: 3,
        parallelism: 1,
      });
      await database.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { pk: `USER#${userId}`, sk: 'PROFILE' },
          UpdateExpression: 'SET passwordHash = :passwordHash',
          ExpressionAttributeValues: { ':passwordHash': passwordHash },
        }),
      );
      await logoutAll(userId);
    },
  };
}
