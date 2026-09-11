import { useEffect, useId, useState } from 'react';

import { entityDefinitions } from '@app/schemas';

import { useEditMode } from '../context/editMode.js';
import {
  fetchCsrfToken,
  fetchDeploymentState,
  fetchPublications,
  retryPublishOperation,
  rollbackPublication,
  type Publication,
} from '../services/cms.js';

type ToolbarPanel = 'none' | 'review' | 'history';

function labelForEntity(entityId: string): string {
  return entityDefinitions.find(({ id }) => id === entityId)?.label ?? 'Page section';
}

export function EditorToolbar(): React.JSX.Element {
  const editing = useEditMode();
  const [history, setHistory] = useState<readonly Publication[]>([]);
  const [panel, setPanel] = useState<ToolbarPanel>('none');
  const [failedOperationId, setFailedOperationId] = useState<string>();
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const actionsId = useId();

  useEffect(() => {
    if (!editing.active) return;
    void fetchDeploymentState()
      .then((state) => setFailedOperationId(state.failedOperation?.id))
      .catch(() => setFailedOperationId(undefined));
  }, [editing.active]);

  const openHistory = (): void => {
    setMobileActionsOpen(false);
    void fetchPublications(editing.pageId)
      .then((items) => {
        setHistory(items);
        setPanel('history');
      })
      .catch(() => undefined);
  };

  const retryFailedDeployment = (): void => {
    if (failedOperationId === undefined) return;
    void fetchCsrfToken()
      .then((token) => retryPublishOperation(failedOperationId, { csrfToken: token }))
      .then(() => setFailedOperationId(undefined))
      .catch(() => undefined);
  };

  if (!editing.active) {
    return (
      <div className="edit-launcher">
        <button
          type="button"
          onClick={() => void editing.enter().catch(() => undefined)}
          disabled={editing.busy}
        >
          Enter edit mode
        </button>
        {editing.message === undefined ? null : <span role="status">{editing.message}</span>}
      </div>
    );
  }

  return (
    <aside className="editor-toolbar" aria-label="Content editor">
      <div>
        <strong>Edit mode</strong>
        <span>
          {editing.pending.length === 1
            ? '1 unpublished change'
            : `${String(editing.pending.length)} unpublished changes`}
        </span>
      </div>
      <button
        type="button"
        className="toolbar-menu-toggle"
        aria-expanded={mobileActionsOpen}
        aria-controls={actionsId}
        onClick={() => setMobileActionsOpen((open) => !open)}
      >
        Editor actions
      </button>
      <div
        className="toolbar-actions"
        id={actionsId}
        data-mobile-open={mobileActionsOpen ? 'true' : 'false'}
      >
        <button
          type="button"
          onClick={() => {
            setMobileActionsOpen(false);
            void editing.setViewingPublic(!editing.viewingPublic).catch(() => undefined);
          }}
          disabled={editing.busy || editing.pending.length === 0}
        >
          {editing.viewingPublic ? 'View my changes' : 'View public'}
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileActionsOpen(false);
            setPanel('review');
          }}
          disabled={editing.busy || editing.pending.length === 0}
        >
          Review and publish
        </button>
        <button type="button" onClick={openHistory} disabled={editing.busy}>
          History
        </button>
        {failedOperationId === undefined ? null : (
          <button type="button" onClick={retryFailedDeployment} disabled={editing.busy}>
            Retry failed update
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setMobileActionsOpen(false);
            editing.leave();
          }}
        >
          Exit edit mode
        </button>
      </div>
      {editing.message === undefined ? null : <p role="status">{editing.message}</p>}
      {panel === 'review' ? (
        <div className="toolbar-panel">
          <div className="panel-heading">
            <strong>Review unpublished changes</strong>
            <button type="button" onClick={() => setPanel('none')}>
              Close
            </button>
          </div>
          <ul>
            {editing.pending.map((change) => (
              <li key={change.entityId}>
                <span>{labelForEntity(change.entityId)}</span>
                <button
                  type="button"
                  onClick={() => void editing.discard(change.entityId).catch(() => undefined)}
                >
                  Discard
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() =>
              void editing
                .publishAll()
                .then(() => setPanel('none'))
                .catch(() => undefined)
            }
          >
            Publish {editing.pending.length === 1 ? 'change' : 'changes'}
          </button>
        </div>
      ) : null}
      {panel === 'history' ? (
        <div className="toolbar-panel">
          <div className="panel-heading">
            <strong>Publication history</strong>
            <button type="button" onClick={() => setPanel('none')}>
              Close
            </button>
          </div>
          {history.length === 0 ? (
            <p>No earlier publications.</p>
          ) : (
            <ul>
              {history.map((publication) => (
                <li key={publication.id}>
                  <span>{new Date(publication.publishedAt).toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !window.confirm(
                          'Restore this earlier version? Some unpublished changes may no longer apply.',
                        )
                      )
                        return;
                      void fetchCsrfToken()
                        .then((csrfToken) => rollbackPublication(publication.id, { csrfToken }))
                        .catch(() => undefined);
                    }}
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </aside>
  );
}
