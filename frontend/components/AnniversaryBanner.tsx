import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useEditMode } from '../context/editMode.js';
import { Button } from './ui/button.js';

const dismissalKey = 'trico-anniversary-dismissed';

function wasDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(dismissalKey) === 'true';
  } catch {
    return false;
  }
}

export function AnniversaryBanner({
  message,
}: {
  readonly message: string;
}): React.JSX.Element | null {
  const editing = useEditMode();
  const [dismissed, setDismissed] = useState(wasDismissed);
  if (dismissed && !editing.active) return null;

  return (
    <div
      data-slot="anniversary-banner"
      role="region"
      aria-label="TriCo anniversary"
      className="flex min-h-11 items-center bg-primary text-center text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground"
    >
      <Link
        to="/community"
        aria-label={`${message} — learn how TriCo is giving back`}
        className="flex min-h-11 min-w-0 flex-1 items-center py-2 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary-foreground"
      >
        <span aria-hidden="true" className="size-11 shrink-0" />
        <span className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <span>{message}</span>
          <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
        </span>
      </Link>
      {editing.active ? (
        <span aria-hidden="true" className="size-11 shrink-0" />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
          aria-label="Dismiss anniversary announcement"
          onClick={() => {
            setDismissed(true);
            try {
              window.sessionStorage.setItem(dismissalKey, 'true');
            } catch {
              // Dismissal still applies to this page when session storage is unavailable.
            }
          }}
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      )}
    </div>
  );
}
