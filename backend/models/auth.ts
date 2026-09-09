export {
  anonymousSessionSchema,
  authenticatedSessionSchema,
  authPrincipalSchema,
  authSessionSchema,
  type AnonymousSession,
  type AuthenticatedSession,
  type AuthPrincipal,
  type AuthSession,
} from '@app/schemas';

export interface AuthenticatedRequestState {
  readonly userId: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly sessionHash: string;
  readonly csrfToken: string;
}
