import { createContext, useContext } from 'react';

import type { PageId } from '../pages/pageContent.js';
import type { PendingChange } from '../services/cms.js';

export interface EditModeValue {
  readonly active: boolean;
  readonly busy: boolean;
  readonly pageId: PageId;
  readonly pending: readonly PendingChange[];
  readonly currentUserId?: string;
  readonly disabledEntityIds: ReadonlySet<string>;
  readonly viewingPublic: boolean;
  readonly message?: string;
  readonly enter: () => Promise<void>;
  readonly leave: () => void;
  readonly save: (entityId: string, value: unknown) => Promise<void>;
  readonly discard: (entityId: string) => Promise<void>;
  readonly togglePreview: (entityId: string) => Promise<void>;
  readonly setViewingPublic: (viewingPublic: boolean) => Promise<void>;
  readonly publishAll: () => Promise<void>;
}

export const EditModeContext = createContext<EditModeValue | undefined>(undefined);

export const useEditMode = (): EditModeValue => {
  const value = useContext(EditModeContext);
  if (value === undefined) throw new Error('useEditMode must be used within EditModeProvider');
  return value;
};
