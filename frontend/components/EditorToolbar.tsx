import { useState } from 'react';

import { useEditMode } from '../context/editMode.js';
import {
  deleteExternalSource,
  createExternalSource,
  fetchCsrfToken,
  fetchDeploymentState,
  fetchExternalSources,
  fetchPublications,
  requestMediaUpload,
  retryPublishOperation,
  rollbackPublication,
  uploadMedia,
  updateExternalSource,
  type ExternalSource,
  type Publication,
} from '../services/cms.js';

export function EditorToolbar(): React.JSX.Element {
  const editing = useEditMode();
  const [history, setHistory] = useState<readonly Publication[]>([]);
  const [panel, setPanel] = useState<'none' | 'history' | 'media' | 'sources'>('none');
  const [mediaUrl, setMediaUrl] = useState<string>();
  const [sources, setSources] = useState<readonly ExternalSource[]>([]);
  const [sourceEntityId, setSourceEntityId] = useState('');
  const [sourceItemId, setSourceItemId] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceTokens, setSourceTokens] = useState('');
  const [sourceType, setSourceType] = useState<'MLS' | 'LOOPNET' | 'CREXI'>('MLS');

  const openHistory = (): void => {
    void fetchPublications(editing.pageId)
      .then((items) => {
        setHistory(items);
        setPanel('history');
      })
      .catch(() => undefined);
  };

  const upload = (file: File | undefined): void => {
    if (file === undefined) return;
    void fetchCsrfToken()
      .then((csrfToken) => requestMediaUpload(file, { csrfToken }))
      .then(async ({ uploadUrl, reference }) => {
        await uploadMedia(file, uploadUrl);
        setMediaUrl(reference.publicUrl);
      })
      .catch(() => undefined);
  };

  const openSources = (): void => {
    void fetchExternalSources(editing.pageId)
      .then((items) => {
        setSources(items);
        setPanel('sources');
      })
      .catch(() => undefined);
  };

  const retryFailedDeployment = (): void => {
    void fetchDeploymentState()
      .then(async (state) => {
        if (state.failedOperation === null) return;
        const token = await fetchCsrfToken();
        await retryPublishOperation(state.failedOperation.id, { csrfToken: token });
      })
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
        <span>{editing.pending.length} pending on this page</span>
      </div>
      <div className="toolbar-actions">
        <button
          type="button"
          onClick={() => void editing.publishAll()}
          disabled={editing.busy || editing.pending.length === 0}
        >
          Publish all
        </button>
        <button type="button" onClick={openHistory} disabled={editing.busy}>
          History
        </button>
        <button type="button" onClick={() => setPanel('media')} disabled={editing.busy}>
          Media
        </button>
        <button type="button" onClick={openSources} disabled={editing.busy}>
          Sources
        </button>
        <button type="button" onClick={retryFailedDeployment} disabled={editing.busy}>
          Retry deployment
        </button>
        <button type="button" onClick={editing.leave}>
          Exit preview
        </button>
      </div>
      {editing.message === undefined ? null : <p role="status">{editing.message}</p>}
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
                        window.confirm(
                          'Restore this publication? Current pending changes may be rebased or removed.',
                        )
                      )
                        void fetchCsrfToken()
                          .then((csrfToken) => rollbackPublication(publication.id, { csrfToken }))
                          .catch(() => undefined);
                    }}
                  >
                    Rollback
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
      {panel === 'media' ? (
        <div className="toolbar-panel">
          <div className="panel-heading">
            <strong>Upload media</strong>
            <button type="button" onClick={() => setPanel('none')}>
              Close
            </button>
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => upload(event.target.files?.[0])}
          />
          {mediaUrl === undefined ? null : (
            <p>
              Uploaded: <code>{mediaUrl}</code>
            </p>
          )}
        </div>
      ) : null}
      {panel === 'sources' ? (
        <div className="toolbar-panel">
          <div className="panel-heading">
            <strong>External listing sources</strong>
            <button type="button" onClick={() => setPanel('none')}>
              Close
            </button>
          </div>
          {sources.length === 0 ? (
            <p>No external sources on this page.</p>
          ) : (
            <ul>
              {sources.map((source) => (
                <li key={source.id}>
                  <span>
                    {source.type}: {source.url}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      void fetchCsrfToken()
                        .then((token) => deleteExternalSource(source.id, { csrfToken: token }))
                        .then(() =>
                          setSources((current) => current.filter((item) => item.id !== source.id)),
                        )
                        .catch(() => undefined)
                    }
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void fetchCsrfToken()
                        .then((token) =>
                          updateExternalSource(
                            source.id,
                            { enabled: !source.enabled },
                            { csrfToken: token },
                          ),
                        )
                        .then((updated) =>
                          setSources((current) =>
                            current.map((item) => (item.id === updated.id ? updated : item)),
                          ),
                        )
                        .catch(() => undefined)
                    }
                  >
                    {source.enabled ? 'Disable' : 'Enable'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void fetchCsrfToken()
                .then((csrfToken) =>
                  createExternalSource(
                    {
                      entityId: sourceEntityId,
                      itemId: sourceItemId,
                      type: sourceType,
                      url: sourceUrl,
                      validationFields: sourceTokens
                        .split(',')
                        .map((token) => token.trim())
                        .filter((token) => token !== ''),
                      enabled: true,
                    },
                    { csrfToken },
                  ),
                )
                .then((created) => {
                  setSources((current) => [...current, created]);
                  setSourceUrl('');
                  setSourceTokens('');
                })
                .catch(() => undefined);
            }}
          >
            <strong>Add source mapping</strong>
            <label>
              Entity ID
              <input
                required
                value={sourceEntityId}
                onChange={(event) => setSourceEntityId(event.target.value)}
              />
            </label>
            <label>
              List item UUID
              <input
                required
                value={sourceItemId}
                onChange={(event) => setSourceItemId(event.target.value)}
              />
            </label>
            <label>
              Source type
              <select
                value={sourceType}
                onChange={(event) =>
                  setSourceType(event.target.value as 'MLS' | 'LOOPNET' | 'CREXI')
                }
              >
                <option value="MLS">MLS</option>
                <option value="LOOPNET">LoopNet</option>
                <option value="CREXI">Crexi</option>
              </select>
            </label>
            <label>
              HTTPS listing URL
              <input
                type="url"
                required
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
              />
            </label>
            <label>
              Validation tokens
              <input
                required
                value={sourceTokens}
                onChange={(event) => setSourceTokens(event.target.value)}
                placeholder="address, price"
              />
            </label>
            <button type="submit">Add source</button>
          </form>
        </div>
      ) : null}
    </aside>
  );
}
