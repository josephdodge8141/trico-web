import { z } from 'zod';

export const emailSchema = z
  .email()
  .max(254)
  .transform((email) => email.trim().toLowerCase());
export const tricoEmailSchema = emailSchema.refine((email) => email.endsWith('@tricoinc.com'), {
  message: 'Email must use the @tricoinc.com domain',
});
const passwordSchema = z.string().min(12).max(128);

export const authPrincipalSchema = z.strictObject({
  subject: z.string().trim().min(1).max(255),
  email: emailSchema,
  emailVerified: z.boolean(),
  displayName: z.string().trim().min(1).max(200).optional(),
});

export const anonymousSessionSchema = z.strictObject({
  authenticated: z.literal(false),
  principal: z.null(),
});

export const authenticatedSessionSchema = z.strictObject({
  authenticated: z.literal(true),
  principal: authPrincipalSchema,
});

export const authSessionSchema = z.discriminatedUnion('authenticated', [
  anonymousSessionSchema,
  authenticatedSessionSchema,
]);

export const loginRequestSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const signupRequestSchema = z.strictObject({
  email: tricoEmailSchema,
  password: passwordSchema,
});

export const registerRequestSchema = signupRequestSchema;
export const registerResponseSchema = z.strictObject({
  userId: z.uuid(),
  email: tricoEmailSchema,
  verificationRequired: z.literal(true),
});
export const tokenRequestSchema = z.strictObject({
  token: z.string().trim().min(32).max(1_024),
});
export const verifyEmailRequestSchema = tokenRequestSchema;
export const requestPasswordResetSchema = z.strictObject({ email: emailSchema });
export const confirmPasswordResetSchema = z.strictObject({
  token: tokenRequestSchema.shape.token,
  password: passwordSchema,
});
export const csrfResponseSchema = z.strictObject({ token: z.string().trim().min(32).max(1_024) });
export const messageResponseSchema = z.strictObject({ message: z.string().trim().min(1).max(500) });

export type AuthPrincipal = z.infer<typeof authPrincipalSchema>;
export type AnonymousSession = z.infer<typeof anonymousSessionSchema>;
export type AuthenticatedSession = z.infer<typeof authenticatedSessionSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;
export type RequestPasswordReset = z.infer<typeof requestPasswordResetSchema>;
export type ConfirmPasswordReset = z.infer<typeof confirmPasswordResetSchema>;
export type CsrfResponse = z.infer<typeof csrfResponseSchema>;
