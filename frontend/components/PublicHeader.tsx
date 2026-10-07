import { useId, useRef, useState, type MouseEvent } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

import { navigationWithCareers, type CareersNavigationLink } from './careersNavigation.js';
import { Button } from './ui/button.js';
import { Container } from '../design-system/layout.js';

export interface PublicHeaderProps {
  readonly logoSrc: string;
  readonly logoAltText: string;
  readonly divisionLabel?: string;
  readonly links: readonly CareersNavigationLink[];
  readonly phone?: string;
  readonly actionLabel: string;
  readonly destinationBase?: string;
}

export function PublicHeader({
  logoSrc,
  logoAltText,
  divisionLabel,
  links,
  phone,
  actionLabel,
  destinationBase = '',
}: PublicHeaderProps): React.JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileId = useId();
  const navigation = navigationWithCareers(links);
  const hrefFor = (destination: string): string => `${destinationBase}#${destination}`;
  const followSection = (event: MouseEvent<HTMLAnchorElement>, destination: string): void => {
    setMenuOpen(false);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const currentUrl = new URL(window.location.href);
    const nextUrl = new URL(hrefFor(destination), currentUrl);
    if (
      nextUrl.origin !== currentUrl.origin ||
      nextUrl.pathname !== currentUrl.pathname ||
      nextUrl.search !== currentUrl.search
    )
      return;
    window.requestAnimationFrame(() => {
      const anchor = document.getElementById(destination);
      const target =
        anchor?.getAttribute('aria-hidden') === 'true'
          ? (anchor.closest('section') ?? anchor)
          : anchor;
      if (!(target instanceof HTMLElement)) return;
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
    });
  };

  return (
    <div
      className="relative z-20 bg-background"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        if (menuOpen && mobileTriggerRef.current?.getClientRects().length)
          mobileTriggerRef.current.focus();
        setMenuOpen(false);
      }}
    >
      <Container width="wide" className="flex min-h-20 items-center justify-between gap-3 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="TriCo home">
          <img
            className="h-12 w-auto max-w-40 object-contain sm:h-14"
            src={logoSrc}
            alt={logoAltText}
          />
          {divisionLabel === undefined ? null : (
            <strong className="hidden truncate font-heading text-sm text-primary 2xl:block">
              {divisionLabel}
            </strong>
          )}
        </Link>
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-2 text-xs font-medium xl:flex 2xl:gap-3"
        >
          {navigation.map((item) => (
            <a
              className="whitespace-nowrap text-muted-foreground hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-primary"
              key={item.id}
              href={hrefFor(item.destination)}
              onClick={(event) => followSection(event, item.destination)}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="hidden shrink-0 items-center gap-2 xl:flex">
          {phone === undefined ? null : (
            <a
              className="hidden whitespace-nowrap text-xs text-muted-foreground hover:text-primary 2xl:inline"
              href={`tel:${phone.replace(/[^\d+]/g, '')}`}
            >
              {phone}
            </a>
          )}
          <Button
            render={
              <a href={hrefFor('contact')} onClick={(event) => followSection(event, 'contact')} />
            }
          >
            {actionLabel} <ArrowRight aria-hidden="true" />
          </Button>
        </div>
        <Button
          ref={mobileTriggerRef}
          variant="outline"
          size="icon"
          className="size-11 xl:hidden"
          type="button"
          aria-expanded={menuOpen}
          aria-controls={mobileId}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </Button>
      </Container>
      <nav
        id={mobileId}
        aria-label="Mobile navigation"
        className={
          menuOpen
            ? 'grid gap-1 border-t border-border bg-background px-4 py-3 xl:hidden'
            : 'hidden'
        }
      >
        {navigation.map((item) => (
          <a
            className="rounded-lg px-3 py-3 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
            key={item.id}
            href={hrefFor(item.destination)}
            onClick={(event) => followSection(event, item.destination)}
          >
            {item.label}
          </a>
        ))}
        {navigation.some(({ destination }) => destination === 'contact') ? null : (
          <a
            className="rounded-lg px-3 py-3 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
            href={hrefFor('contact')}
            onClick={(event) => followSection(event, 'contact')}
          >
            Contact
          </a>
        )}
        {phone === undefined ? null : (
          <a
            className="rounded-lg px-3 py-3 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
            href={`tel:${phone.replace(/[^\d+]/g, '')}`}
            onClick={() => setMenuOpen(false)}
          >
            {phone}
          </a>
        )}
      </nav>
    </div>
  );
}
