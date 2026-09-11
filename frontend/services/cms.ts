import {
  csrfResponseSchema,
  deploymentStateResponseSchema,
  externalSourceSchema,
  externalSourcesResponseSchema,
  mediaAssetSchema,
  mediaLibraryResponseSchema,
  mediaPresignResponseSchema,
  pendingChangeResponseSchema,
  pendingChangesResponseSchema,
  previewPreferencesResponseSchema,
  publicationHistoryResponseSchema,
  publishResponseSchema,
  type ExternalSource,
  type MediaPresignResponse,
  type MediaAsset,
  type MediaLibraryResponse,
  type PageId,
  type PendingChange,
  type Publication,
  type PublishOperation,
  type PublishResponse,
} from '@app/schemas';

export type { ExternalSource, PendingChange, Publication, PublishOperation };
export type { MediaAsset, MediaLibraryResponse, MediaPresignResponse };

export interface CmsRequestOptions {
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
  readonly csrfToken?: string;
}

export class CmsRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'CmsRequestError';
  }
}

const request = async (
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body: unknown,
  options: CmsRequestOptions,
): Promise<unknown> => {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (fetchImpl === undefined) throw new Error('Fetch is unavailable in this environment');
  const response = await fetchImpl(url, {
    method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(options.csrfToken === undefined ? {} : { 'X-CSRF-Token': options.csrfToken }),
    },
    body: body === undefined ? null : JSON.stringify(body),
    signal: options.signal ?? null,
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => undefined)) as
      { readonly message?: unknown } | undefined;
    throw new CmsRequestError(
      typeof problem?.message === 'string'
        ? problem.message
        : `CMS request failed (${response.status})`,
      response.status,
    );
  }
  return response.status === 204 ? undefined : response.json();
};

export const fetchCsrfToken = async (options: CmsRequestOptions = {}): Promise<string> =>
  csrfResponseSchema.parse(await request('/api/v1/auth/csrf', 'GET', undefined, options)).token;

export const fetchPendingChanges = async (
  pageId: PageId,
  options: CmsRequestOptions = {},
): Promise<readonly PendingChange[]> =>
  pendingChangesResponseSchema.parse(
    await request(
      `/api/v1/changes?pageId=${encodeURIComponent(pageId)}`,
      'GET',
      undefined,
      options,
    ),
  ).changes;

export const fetchPreviewDisabled = async (
  options: CmsRequestOptions = {},
): Promise<readonly string[]> =>
  previewPreferencesResponseSchema.parse(
    await request('/api/v1/preview/preferences', 'GET', undefined, options),
  ).disabledEntityIds;

export const saveEntityChange = async (
  entityId: string,
  replacementValue: unknown,
  existingRevision: number | undefined,
  options: CmsRequestOptions,
): Promise<PendingChange> =>
  pendingChangeResponseSchema.parse(
    await request(
      `/api/v1/entities/${encodeURIComponent(entityId)}/changes`,
      existingRevision === undefined ? 'POST' : 'PUT',
      existingRevision === undefined
        ? { replacementValue }
        : { replacementValue, expectedRevision: existingRevision },
      options,
    ),
  );

export const discardEntityChange = async (
  entityId: string,
  expectedRevision: number,
  options: CmsRequestOptions,
): Promise<void> => {
  await request(
    `/api/v1/entities/${encodeURIComponent(entityId)}/changes`,
    'DELETE',
    { expectedRevision },
    options,
  );
};

export const setPreviewDisabled = async (
  entityId: string,
  disabled: boolean,
  options: CmsRequestOptions,
): Promise<void> => {
  await request(
    `/api/v1/preview/disabled/${encodeURIComponent(entityId)}`,
    disabled ? 'PUT' : 'DELETE',
    undefined,
    options,
  );
};

export const publishChanges = async (
  selections: readonly { readonly entityId: string; readonly expectedRevision: number }[],
  options: CmsRequestOptions,
): Promise<PublishResponse> =>
  publishResponseSchema.parse(await request('/api/v1/publish', 'POST', { selections }, options));

export const fetchPublications = async (
  pageId: PageId,
  options: CmsRequestOptions = {},
): Promise<readonly Publication[]> =>
  publicationHistoryResponseSchema.parse(
    await request(`/api/v1/publications/${pageId}`, 'GET', undefined, options),
  ).publications;

export const rollbackPublication = async (
  publicationId: string,
  options: CmsRequestOptions = {},
): Promise<PublishResponse> =>
  publishResponseSchema.parse(
    await request(
      `/api/v1/publications/${encodeURIComponent(publicationId)}/rollback`,
      'POST',
      { publicationId },
      options,
    ),
  );

export const requestMediaUpload = async (
  file: File,
  options: CmsRequestOptions = {},
): Promise<MediaPresignResponse> =>
  mediaPresignResponseSchema.parse(
    await request(
      '/api/v1/media/presign',
      'POST',
      { fileName: file.name, contentType: file.type, contentLength: file.size },
      options,
    ),
  );

export const uploadMedia = async (
  file: File,
  uploadUrl: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<void> => {
  const response = await fetchImpl(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!response.ok) throw new Error(`Media upload failed (${response.status})`);
};

export const confirmMediaUpload = async (
  uploadId: string,
  name: string,
  altText: string,
  options: CmsRequestOptions,
): Promise<MediaAsset> =>
  mediaAssetSchema.parse(
    await request('/api/v1/media/confirm', 'POST', { uploadId, name, altText }, options),
  );

export const fetchMediaLibrary = async (
  cursor: string | undefined,
  limit = 24,
  options: CmsRequestOptions = {},
): Promise<MediaLibraryResponse> => {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor !== undefined) query.set('cursor', cursor);
  return mediaLibraryResponseSchema.parse(
    await request(`/api/v1/media?${query.toString()}`, 'GET', undefined, options),
  );
};

export const fetchDeploymentState = async (
  options: CmsRequestOptions = {},
): Promise<{ readonly blocked: boolean; readonly failedOperation: PublishOperation | null }> =>
  deploymentStateResponseSchema.parse(
    await request('/api/v1/publish-operations/state', 'GET', undefined, options),
  );

export const retryPublishOperation = async (
  operationId: string,
  options: CmsRequestOptions,
): Promise<void> => {
  await request(
    `/api/v1/publish-operations/${encodeURIComponent(operationId)}/retry`,
    'POST',
    {},
    options,
  );
};

export const fetchExternalSources = async (
  pageId: PageId,
  options: CmsRequestOptions = {},
): Promise<readonly ExternalSource[]> =>
  externalSourcesResponseSchema.parse(
    await request(`/api/v1/external-sources?pageId=${pageId}`, 'GET', undefined, options),
  ).sources;

export const deleteExternalSource = async (
  sourceId: string,
  options: CmsRequestOptions,
): Promise<void> => {
  await request(
    `/api/v1/external-sources/${encodeURIComponent(sourceId)}`,
    'DELETE',
    undefined,
    options,
  );
};

export const createExternalSource = async (
  input: Pick<
    ExternalSource,
    'entityId' | 'itemId' | 'type' | 'url' | 'validationFields' | 'enabled' | 'overriddenFields'
  >,
  options: CmsRequestOptions,
): Promise<ExternalSource> =>
  externalSourceSchema.parse(await request('/api/v1/external-sources', 'POST', input, options));

export const updateExternalSource = async (
  sourceId: string,
  input: Partial<
    Pick<ExternalSource, 'type' | 'url' | 'validationFields' | 'enabled' | 'overriddenFields'>
  >,
  options: CmsRequestOptions,
): Promise<ExternalSource> =>
  externalSourceSchema.parse(
    await request(
      `/api/v1/external-sources/${encodeURIComponent(sourceId)}`,
      'PUT',
      input,
      options,
    ),
  );
