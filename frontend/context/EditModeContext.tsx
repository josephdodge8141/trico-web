import { useCallback, useMemo, useState } from 'react';

import type { PageId } from '../pages/pageContent.js';
import {
  discardEntityChange,
  fetchCsrfToken,
  fetchPendingChanges,
  publishChanges,
  saveEntityChange,
  setPreviewDisabled,
  type PendingChange,
} from '../services/cms.js';
import { EditModeContext, type EditModeValue } from './editMode.js';

export function EditModeProvider({
  pageId,
  children,
}: {
  readonly pageId: PageId;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<readonly PendingChange[]>([]);
  const [csrfToken, setCsrfToken] = useState<string>();
  const [disabledEntityIds, setDisabledEntityIds] = useState<ReadonlySet<string>>(() => new Set());
  const [message, setMessage] = useState<string>();

  const perform = useCallback(
    async (operation: (token: string) => Promise<void>): Promise<void> => {
      setBusy(true);
      setMessage(undefined);
      try {
        const token = csrfToken ?? (await fetchCsrfToken());
        if (csrfToken === undefined) setCsrfToken(token);
        await operation(token);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'The request could not be completed.');
        throw error;
      } finally {
        setBusy(false);
      }
    },
    [csrfToken],
  );

  const enter = useCallback(async (): Promise<void> => {
    await perform(async () => {
      const changes = await fetchPendingChanges(pageId);
      setPending(changes);
      setActive(true);
      setMessage('Edit mode is active. Changes remain private until published.');
    });
  }, [pageId, perform]);

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
        setMessage(`${entityId} saved as a private change.`);
      });
    },
    [pending, perform],
  );

  const discard = useCallback(
    async (entityId: string): Promise<void> => {
      const current = pending.find((change) => change.entityId === entityId);
      if (current === undefined) return;
      await perform(async (token) => {
        await discardEntityChange(entityId, current.revision, { csrfToken: token });
        setPending((changes) => changes.filter((change) => change.entityId !== entityId));
        setMessage(`${entityId} discarded.`);
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

  const value = useMemo<EditModeValue>(
    () => ({
      active,
      busy,
      pageId,
      pending,
      disabledEntityIds,
      ...(message === undefined ? {} : { message }),
      enter,
      leave,
      save,
      discard,
      togglePreview,
      publishAll,
    }),
    [
      active,
      busy,
      pageId,
      pending,
      disabledEntityIds,
      message,
      enter,
      leave,
      save,
      discard,
      togglePreview,
      publishAll,
    ],
  );
  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
}
