import { Button } from './ui/button.js';

export function FooterQuickLink({
  href,
  children,
}: {
  readonly href: string;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Button
      render={<a href={href} />}
      variant="link"
      className="h-auto min-h-11 w-fit max-w-full justify-start px-0 py-2 text-left text-sm font-normal whitespace-normal text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground focus-visible:ring-sidebar-foreground/50 md:min-h-8 md:py-1"
    >
      {children}
    </Button>
  );
}
