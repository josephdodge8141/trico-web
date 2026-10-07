import { lazy, Suspense } from 'react';

import { useEditMode } from '../context/editMode.js';

const EditorToolbar = lazy(() =>
  import('./EditorToolbar.js').then(({ EditorToolbar }) => ({ default: EditorToolbar })),
);

export function AuthenticatedEditorToolbar(): React.JSX.Element | null {
  const { authenticated } = useEditMode();
  if (!authenticated) return null;
  return (
    <Suspense fallback={null}>
      <EditorToolbar />
    </Suspense>
  );
}
