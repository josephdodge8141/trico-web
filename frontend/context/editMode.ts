import { createContext, useContext } from 'react';
import type { EditableValue } from '@app/schemas';

import type { PageId } from '../pages/pageContent.js';
import type { PendingChange } from '../services/cms.js';
import type { MediaAsset } from '../services/cms.js';

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
  readonly reload: (entityId: string) => Promise<EditableValue>;
  readonly discard: (entityId: string) => Promise<void>;
  readonly togglePreview: (entityId: string) => Promise<void>;
  readonly setViewingPublic: (viewingPublic: boolean) => Promise<void>;
  readonly publishAll: () => Promise<void>;
  readonly requestMedia: (onSelect: (asset: MediaAsset) => void) => void;
}

export const EditModeContext = createContext<EditModeValue | undefined>(undefined);

export const useEditMode = (): EditModeValue => {
  const value = useContext(EditModeContext);
  if (value === undefined) throw new Error('useEditMode must be used within EditModeProvider');
  return value;
};
