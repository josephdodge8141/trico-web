import { useEffect, useId, useState } from 'react';
import { History, Menu, Pencil, Send, X } from 'lucide-react';

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
import { Badge } from './ui/badge.js';
import { Button } from './ui/button.js';
import { Card, CardContent } from './ui/card.js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog.js';
import { Separator } from './ui/separator.js';

type ToolbarPanel = 'none' | 'review' | 'history';

function labelForEntity(entityId: string): string {
  return entityDefinitions.find(({ id }) => id === entityId)?.label ?? 'Page section';
}

export function EditorToolbar(): React.JSX.Element | null {
  const editing = useEditMode();
  const [history, setHistory] = useState<readonly Publication[]>([]);
  const [panel, setPanel] = useState<ToolbarPanel>('none');
  const [failedOperationId, setFailedOperationId] = useState<string>();
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const actionsId = useId();
  const reviewDescriptionId = useId();

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
    if (!editing.authenticated) return null;
    return (
      <div className="fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-2">
        {editing.message === undefined ? null : (
          <Card size="sm" role="status" className="max-w-xs shadow-lg">
            <CardContent>{editing.message}</CardContent>
          </Card>
        )}
        <Button
          type="button"
          size="lg"
          className="rounded-full bg-sidebar text-sidebar-foreground shadow-xl hover:bg-sidebar/90"
          onClick={() => void editing.enter().catch(() => undefined)}
          disabled={editing.busy}
        >
          <Pencil aria-hidden="true" /> Enter edit mode
        </Button>
      </div>
    );
  }

  return (
    <>
      <aside
        className="fixed bottom-3 left-3 right-3 z-40 mx-auto max-w-6xl rounded-xl border bg-background/95 p-3 text-foreground shadow-2xl backdrop-blur-md"
        aria-label="Content editor"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge className="gap-1">
              <Pencil className="size-3" aria-hidden="true" /> Edit mode
            </Badge>
            <span className="text-xs text-muted-foreground">
              {editing.pending.length === 1
                ? '1 unpublished change'
                : `${String(editing.pending.length)} unpublished changes`}
            </span>
            {editing.message === undefined ? null : (
              <span
                role="status"
                className="sr-only text-xs text-muted-foreground md:not-sr-only md:w-full"
              >
                {editing.message}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            className="md:hidden"
            aria-expanded={mobileActionsOpen}
            aria-controls={actionsId}
            onClick={() => setMobileActionsOpen((open) => !open)}
          >
            <Menu aria-hidden="true" /> Editor actions
          </Button>
          <div className="hidden items-center gap-2 md:flex">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void editing.setViewingPublic(!editing.viewingPublic).catch(() => undefined)
              }
              disabled={editing.busy || editing.pending.length === 0}
            >
              {editing.viewingPublic ? 'View my changes' : 'View public'}
            </Button>
            <Button
              type="button"
              onClick={() => setPanel('review')}
              disabled={editing.busy || editing.pending.length === 0}
            >
              <Send aria-hidden="true" /> Review and publish
            </Button>
            <Button type="button" variant="outline" onClick={openHistory} disabled={editing.busy}>
              <History aria-hidden="true" /> History
            </Button>
            {failedOperationId === undefined ? null : (
              <Button
                type="button"
                variant="destructive"
                onClick={retryFailedDeployment}
                disabled={editing.busy}
              >
                Retry failed update
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => editing.leave()}>
              <X aria-hidden="true" /> Exit edit mode
            </Button>
          </div>
        </div>
        <div
          id={actionsId}
          className={mobileActionsOpen ? 'mt-3 grid gap-2 border-t pt-3 md:hidden' : 'hidden'}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMobileActionsOpen(false);
              void editing.setViewingPublic(!editing.viewingPublic).catch(() => undefined);
            }}
            disabled={editing.busy || editing.pending.length === 0}
          >
            {editing.viewingPublic ? 'View my changes' : 'View public'}
          </Button>
          <Button
            type="button"
            onClick={() => {
              setMobileActionsOpen(false);
              setPanel('review');
            }}
            disabled={editing.busy || editing.pending.length === 0}
          >
            Review and publish
          </Button>
          <Button type="button" variant="outline" onClick={openHistory} disabled={editing.busy}>
            History
          </Button>
          {failedOperationId === undefined ? null : (
            <Button
              type="button"
              variant="destructive"
              onClick={retryFailedDeployment}
              disabled={editing.busy}
            >
              Retry failed update
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setMobileActionsOpen(false);
              editing.leave();
            }}
          >
            Exit edit mode
          </Button>
        </div>
      </aside>
      <Dialog
        open={panel !== 'none'}
        onOpenChange={(open) => {
          if (!open) setPanel('none');
        }}
      >
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
          {panel === 'review' ? (
            <>
              <DialogHeader>
                <DialogTitle>Review unpublished changes</DialogTitle>
                <DialogDescription id={reviewDescriptionId}>
                  Publishing makes {editing.pending.length === 1 ? 'this change' : 'these changes'}{' '}
                  visible on the public website.
                </DialogDescription>
              </DialogHeader>
              <Separator />
              <ul className="divide-y rounded-lg border" aria-label="Unpublished changes">
                {editing.pending.map((change) => (
                  <li
                    key={change.entityId}
                    className="flex items-center justify-between gap-3 p-3 text-sm"
                  >
                    <span>{labelForEntity(change.entityId)}</span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void editing.discard(change.entityId).catch(() => undefined)}
                    >
                      Discard
                    </Button>
                  </li>
                ))}
              </ul>
              <DialogFooter>
                <Button
                  type="button"
                  size="lg"
                  className="min-h-11 w-full"
                  aria-describedby={reviewDescriptionId}
                  onClick={() =>
                    void editing
                      .publishAll()
                      .then(() => setPanel('none'))
                      .catch(() => undefined)
                  }
                >
                  Publish {editing.pending.length === 1 ? 'change' : 'changes'}
                </Button>
              </DialogFooter>
            </>
          ) : null}
          {panel === 'history' ? (
            <>
              <DialogHeader>
                <DialogTitle>Publication history</DialogTitle>
                <DialogDescription>
                  Restore an earlier published version of this page.
                </DialogDescription>
              </DialogHeader>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No earlier publications.</p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {history.map((publication) => (
                    <li
                      key={publication.id}
                      className="flex items-center justify-between gap-3 p-3 text-sm"
                    >
                      <span>{new Date(publication.publishedAt).toLocaleString()}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
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
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
