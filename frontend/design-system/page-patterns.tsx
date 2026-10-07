import type { ReactNode } from 'react';
import { cn } from 'cn';

interface PatternProps {
  readonly children: ReactNode;
  readonly className?: string;
}

interface HeaderPatternProps extends PatternProps {
  readonly header: ReactNode;
}

interface SidebarPatternProps extends HeaderPatternProps {
  readonly sidebar: ReactNode;
}

export function MarketingLayout({
  header,
  children,
  className,
}: HeaderPatternProps): React.JSX.Element {
  return (
    <div data-slot="marketing-layout" className={cn('min-w-0 bg-background', className)}>
      <header className="border-b">{header}</header>
      <main className="min-w-0">{children}</main>
    </div>
  );
}

export function DocumentationLayout({
  header,
  sidebar,
  children,
  className,
}: SidebarPatternProps): React.JSX.Element {
  return (
    <div data-slot="documentation-layout" className={cn('min-w-0', className)}>
      <header className="border-b">{header}</header>
      <div className="grid min-w-0 grid-cols-1 md:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Documentation" className="min-w-0 border-b p-4 md:border-r md:border-b-0">
          {sidebar}
        </nav>
        <main className="min-w-0 p-4">{children}</main>
      </div>
    </div>
  );
}

export function DashboardLayout({
  header,
  children,
  className,
}: HeaderPatternProps): React.JSX.Element {
  return (
    <div data-slot="dashboard-layout" className={cn('min-w-0', className)}>
      <header className="mb-5">{header}</header>
      <main className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</main>
    </div>
  );
}

export function DetailLayout({
  header,
  children,
  aside,
  className,
}: HeaderPatternProps & { readonly aside: ReactNode }): React.JSX.Element {
  return (
    <div data-slot="detail-layout" className={cn('min-w-0', className)}>
      <header className="mb-5">{header}</header>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="min-w-0">{children}</main>
        <aside className="min-w-0">{aside}</aside>
      </div>
    </div>
  );
}

export function EditorLayout({
  header,
  children,
  tools,
  className,
}: HeaderPatternProps & { readonly tools: ReactNode }): React.JSX.Element {
  return (
    <div data-slot="editor-layout" className={cn('min-w-0', className)}>
      <header className="border-b pb-3">{header}</header>
      <div className="grid min-w-0 gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <main className="min-w-0">{children}</main>
        <aside aria-label="Editor tools" className="min-w-0">
          {tools}
        </aside>
      </div>
    </div>
  );
}

export function InboxLayout({
  header,
  list,
  children,
  className,
}: HeaderPatternProps & { readonly list: ReactNode }): React.JSX.Element {
  return (
    <div data-slot="inbox-layout" className={cn('min-w-0', className)}>
      <header className="border-b pb-3">{header}</header>
      <div className="grid min-w-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside
          aria-label="Items"
          className="min-w-0 border-b py-3 lg:border-r lg:border-b-0 lg:pe-4"
        >
          {list}
        </aside>
        <main className="min-w-0 py-3 lg:ps-4">{children}</main>
      </div>
    </div>
  );
}

export function GalleryLayout({
  header,
  children,
  className,
}: HeaderPatternProps): React.JSX.Element {
  return (
    <div data-slot="gallery-layout" className={cn('min-w-0', className)}>
      <header className="mb-5">{header}</header>
      <main className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {children}
      </main>
    </div>
  );
}

export function FormLayout({
  header,
  children,
  actions,
  className,
}: HeaderPatternProps & { readonly actions: ReactNode }): React.JSX.Element {
  return (
    <div data-slot="form-layout" className={cn('min-w-0', className)}>
      <header className="mb-5">{header}</header>
      <main className="min-w-0 max-w-2xl space-y-5">{children}</main>
      <footer className="mt-5 flex flex-wrap justify-end gap-2 border-t pt-4">{actions}</footer>
    </div>
  );
}

export function StatusLayout({
  title,
  description,
  action,
  className,
}: {
  readonly title: string;
  readonly description: ReactNode;
  readonly action?: ReactNode;
  readonly className?: string;
}): React.JSX.Element {
  return (
    <main
      data-slot="status-layout"
      className={cn(
        'mx-auto grid min-h-40 max-w-xl place-content-center gap-3 p-6 text-center',
        className,
      )}
    >
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="text-muted-foreground">{description}</div>
      {action === undefined ? null : <div className="mt-2">{action}</div>}
    </main>
  );
}
