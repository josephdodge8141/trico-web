import { useCallback, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { editableValueSchema, type EditableValue } from '@app/schemas';

import type { PageId } from '../pages/pageContent.js';
import { MediaLibraryDialog } from '../components/MediaLibraryDialog.js';
import { fetchAuthSession } from '../services/auth.js';
import {
  discardEntityChange,
  CmsRequestError,
  fetchCsrfToken,
  fetchPendingChanges,
  fetchPreviewDisabled,
  fetchMediaLibrary,
  requestMediaUpload,
  uploadMedia,
  confirmMediaUpload,
  publishChanges,
  saveEntityChange,
  setPreviewDisabled,
  type PendingChange,
  type MediaAsset,
} from '../services/cms.js';
import { EditModeContext, type EditModeValue } from './editMode.js';

export function EditModeProvider({
  pageId,
  children,
}: {
  readonly pageId: PageId;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<readonly PendingChange[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const [csrfToken, setCsrfToken] = useState<string>();
  const [disabledEntityIds, setDisabledEntityIds] = useState<ReadonlySet<string>>(() => new Set());
  const [message, setMessage] = useState<string>();
  const [mediaOpen, setMediaOpen] = useState(false);
  const mediaSelection = useRef<((asset: MediaAsset) => void) | undefined>(undefined);

  const getCsrfToken = useCallback(async (): Promise<string> => {
    if (csrfToken !== undefined) return csrfToken;
    const token = await fetchCsrfToken();
    setCsrfToken(token);
    return token;
  }, [csrfToken]);

  const perform = useCallback(
    async (operation: (token: string) => Promise<void>): Promise<void> => {
      setBusy(true);
      setMessage(undefined);
      try {
        const token = await getCsrfToken();
        await operation(token);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'The request could not be completed.');
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [getCsrfToken],
  );

  const requestMedia = useCallback((onSelect: (asset: MediaAsset) => void): void => {
    mediaSelection.current = onSelect;
    setMediaOpen(true);
  }, []);

  const closeMedia = useCallback((): void => {
    setMediaOpen(false);
    mediaSelection.current = undefined;
  }, []);

  const enter = useCallback(async (): Promise<void> => {
    try {
      await perform(async () => {
        const [changes, disabledIds, session] = await Promise.all([
          fetchPendingChanges(pageId),
          fetchPreviewDisabled(),
          fetchAuthSession(),
        ]);
        if (!session.authenticated) throw new CmsRequestError('Authentication is required', 401);
        setPending(changes);
        setCurrentUserId(session.principal.subject);
        setDisabledEntityIds(new Set(disabledIds));
        setActive(true);
        setMessage('Edit mode is active. Changes remain private until published.');
      });
    } catch (error) {
      if (error instanceof CmsRequestError && error.status === 401) {
        navigate('/login', {
          state: { returnTo: `${location.pathname}${location.search}${location.hash}` },
        });
        return;
      }
      throw error;
    }
  }, [location.hash, location.pathname, location.search, navigate, pageId, perform]);

  const leave = useCallback((): void => {
    setActive(false);
    setMessage(undefined);
  }, []);

  const save = useCallback(
    async (entityId: string, value: unknown): Promise<void> => {
      await perform(async (token) => {
        const current = pending.find((change) => change.entityId === entityId);
        const saved = await saveEntityChange(entityId, value, current?.revision, {
          csrfToken: token,
        });
        setPending((changes) => [
          ...changes.filter((change) => change.entityId !== entityId),
          saved,
        ]);
        setMessage('Your private change was saved.');
      });
    },
    [pending, perform],
  );

  const reload = useCallback(
    async (entityId: string): Promise<EditableValue> => {
      const changes = await fetchPendingChanges(pageId);
      setPending(changes);
      const latest = changes.find((change) => change.entityId === entityId);
      if (latest === undefined) throw new Error('The latest saved change is no longer available.');
      return editableValueSchema.parse(latest.replacementValue);
    },
    [pageId],
  );

  const discard = useCallback(
    async (entityId: string): Promise<void> => {
      const current = pending.find((change) => change.entityId === entityId);
      if (current === undefined) return;
      await perform(async (token) => {
        await discardEntityChange(entityId, current.revision, { csrfToken: token });
        setPending((changes) => changes.filter((change) => change.entityId !== entityId));
        setMessage('The private change was discarded.');
      });
    },
    [pending, perform],
  );

  const togglePreview = useCallback(
    async (entityId: string): Promise<void> => {
      const disabled = !disabledEntityIds.has(entityId);
      await perform(async (token) => {
        await setPreviewDisabled(entityId, disabled, { csrfToken: token });
        setDisabledEntityIds((current) => {
          const next = new Set(current);
          if (disabled) next.add(entityId);
          else next.delete(entityId);
          return next;
        });
        setMessage(
          disabled ? 'Change hidden from your preview.' : 'Change restored to your preview.',
        );
      });
    },
    [disabledEntityIds, perform],
  );

  const publishAll = useCallback(async (): Promise<void> => {
    await perform(async (token) => {
      await publishChanges(
        pending.map(({ entityId, revision }) => ({ entityId, expectedRevision: revision })),
        { csrfToken: token },
      );
      setPending([]);
      setMessage(
        'Publication accepted. The public manifest will update when deployment completes.',
      );
    });
  }, [pending, perform]);

  const setViewingPublic = useCallback(
    async (viewingPublic: boolean): Promise<void> => {
      await perform(async (token) => {
        await Promise.all(
          pending.map((change) =>
            setPreviewDisabled(change.entityId, viewingPublic, { csrfToken: token }),
          ),
        );
        setDisabledEntityIds(
          viewingPublic ? new Set(pending.map(({ entityId }) => entityId)) : new Set(),
        );
        setMessage(viewingPublic ? 'Showing the public version.' : 'Showing your private changes.');
      });
    },
    [pending, perform],
  );

  const value = useMemo<EditModeValue>(
    () => ({
      active,
      busy,
      pageId,
      pending,
      ...(currentUserId === undefined ? {} : { currentUserId }),
      disabledEntityIds,
      viewingPublic:
        pending.length > 0 && pending.every(({ entityId }) => disabledEntityIds.has(entityId)),
      ...(message === undefined ? {} : { message }),
      enter,
      leave,
      save,
      reload,
      discard,
      togglePreview,
      setViewingPublic,
      publishAll,
      requestMedia,
    }),
    [
      active,
      busy,
      pageId,
      pending,
      currentUserId,
      disabledEntityIds,
      message,
      enter,
      leave,
      save,
      reload,
      discard,
      togglePreview,
      setViewingPublic,
      publishAll,
      requestMedia,
    ],
  );
  return (
    <EditModeContext.Provider value={value}>
      {children}
      <MediaLibraryDialog
        open={mediaOpen}
        onClose={closeMedia}
        onSelect={(asset) => {
          mediaSelection.current?.(asset);
          closeMedia();
        }}
        loadPage={(cursor) => fetchMediaLibrary(cursor)}
        requestUpload={async (file) =>
          requestMediaUpload(file, { csrfToken: await getCsrfToken() })
        }
        upload={uploadMedia}
        confirmUpload={async (uploadId, name, altText) =>
          confirmMediaUpload(uploadId, name, altText, {
            csrfToken: await getCsrfToken(),
          })
        }
      />
    </EditModeContext.Provider>
  );
}
