import { z } from 'zod';

import type { LeafEditorControl } from './editor-contracts.js';

export const publicVisibilitySchema = z.enum(['legacy', 'approved', 'hidden']).default('legacy');
export type PublicVisibility = z.infer<typeof publicVisibilitySchema>;

export function publicVisibilityControl(): LeafEditorControl {
  return {
    type: 'enum',
    display: 'select',
    choices: [
      { value: 'legacy', label: 'Keep existing visibility' },
      { value: 'approved', label: 'Approved for public display' },
      { value: 'hidden', label: 'Hide from public' },
    ],
  };
}

export function isPubliclyVisible(status: PublicVisibility, previouslyVisible: boolean): boolean {
  return status === 'approved' || (status === 'legacy' && previouslyVisible);
}
