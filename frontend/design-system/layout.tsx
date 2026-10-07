import type { ComponentProps, ReactNode } from 'react';
import { cn } from 'cn';

type DivProps = ComponentProps<'div'>;

export function Box({ className, ...props }: DivProps): React.JSX.Element {
  return <div data-slot="box" className={className} {...props} />;
}

export function Container({
  className,
  width = 'wide',
  ...props
}: DivProps & { readonly width?: 'narrow' | 'medium' | 'wide' | 'full' }): React.JSX.Element {
  const widths = {
    narrow: 'max-w-2xl',
    medium: 'max-w-5xl',
    wide: 'max-w-7xl',
    full: 'max-w-none',
  };
  return (
    <div
      data-slot="container"
      className={cn('mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8', widths[width], className)}
      {...props}
    />
  );
}

export function Stack({
  className,
  direction = 'vertical',
  ...props
}: DivProps & {
  readonly direction?: 'vertical' | 'horizontal' | 'responsive';
}): React.JSX.Element {
  const directions = {
    vertical: 'flex-col',
    horizontal: 'flex-row',
    responsive: 'flex-col sm:flex-row',
  };
  return (
    <div
      data-slot="stack"
      className={cn('flex min-w-0 gap-4', directions[direction], className)}
      {...props}
    />
  );
}

export function Grid({
  className,
  columns = 3,
  ...props
}: DivProps & { readonly columns?: 1 | 2 | 3 | 4 }): React.JSX.Element {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4',
  };
  return (
    <div
      data-slot="grid"
      className={cn('grid min-w-0 gap-4', columnClasses[columns], className)}
      {...props}
    />
  );
}

export function Paper({ className, ...props }: DivProps): React.JSX.Element {
  return (
    <div
      data-slot="paper"
      className={cn(
        'min-w-0 rounded-xl border bg-card p-5 text-card-foreground shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

export function AppBar({ className, ...props }: ComponentProps<'header'>): React.JSX.Element {
  return (
    <header
      data-slot="app-bar"
      className={cn(
        'sticky top-0 z-30 min-w-0 border-b bg-background/95 backdrop-blur-sm',
        className,
      )}
      {...props}
    />
  );
}

export interface WorkspaceLayoutProps extends DivProps {
  readonly header?: ReactNode;
  readonly navigation?: ReactNode;
  readonly toolbar?: ReactNode;
  readonly detail?: ReactNode;
}

export function WorkspaceLayout({
  header,
  navigation,
  toolbar,
  detail,
  children,
  className,
  ...props
}: WorkspaceLayoutProps): React.JSX.Element {
  return (
    <div
      data-slot="workspace-layout"
      className={cn('min-h-svh min-w-0 bg-background', className)}
      {...props}
    >
      {header === undefined ? null : <AppBar>{header}</AppBar>}
      <div
        className={cn(
          'mx-auto grid w-full min-w-0 max-w-screen-2xl grid-cols-1',
          navigation === undefined ? '' : 'lg:grid-cols-[15rem_minmax(0,1fr)]',
        )}
      >
        {navigation === undefined ? null : (
          <div
            data-slot="workspace-navigation"
            className="min-w-0 border-b p-4 lg:min-h-[calc(100svh-4rem)] lg:border-r lg:border-b-0"
          >
            {navigation}
          </div>
        )}
        <div className="min-w-0">
          {toolbar === undefined ? null : <div className="min-w-0 border-b p-4">{toolbar}</div>}
          <div
            className={cn(
              'grid min-w-0 grid-cols-1',
              detail === undefined ? '' : 'xl:grid-cols-[minmax(0,1fr)_20rem]',
            )}
          >
            <main className="min-w-0 p-4 sm:p-6">{children}</main>
            {detail === undefined ? null : (
              <aside className="min-w-0 border-t p-4 xl:border-t-0 xl:border-l">{detail}</aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly className?: string;
}): React.JSX.Element {
  return (
    <div
      data-slot="page-header"
      className={cn(
        'flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="wrap-break-word text-3xl font-semibold tracking-tight">{title}</h1>
        {description === undefined ? null : (
          <p className="mt-1 text-muted-foreground">{description}</p>
        )}
      </div>
      {actions === undefined ? null : (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      )}
    </div>
  );
}

export function Masonry({ className, ...props }: DivProps): React.JSX.Element {
  return (
    <div
      data-slot="masonry"
      className={cn(
        'columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid',
        className,
      )}
      {...props}
    />
  );
}

export function ImageList({ className, ...props }: ComponentProps<'ul'>): React.JSX.Element {
  return (
    <ul
      data-slot="image-list"
      className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4', className)}
      {...props}
    />
  );
}

// Copied from fullstack-ts; inspired by Tim DeHof's MIT-licensed shadcn Timeline:
// https://github.com/timDeHof/shadcn-timeline
// CMS-owned list elements use the same rail and marker geometry as the template.
export const timelineClassName =
  'ps-0 [&>li]:relative [&>li]:border-s [&>li]:border-border [&>li]:pb-6 [&>li]:ps-6 [&>li]:before:absolute [&>li]:before:-inset-s-[6px] [&>li]:before:top-1 [&>li]:before:z-10 [&>li]:before:size-3 [&>li]:before:rounded-full [&>li]:before:bg-primary [&>li:last-child]:border-s-transparent [&>li:last-child]:pb-0 [&>li:last-child]:after:absolute [&>li:last-child]:after:inset-s-0 [&>li:last-child]:after:top-0 [&>li:last-child]:after:h-2.5 [&>li:last-child]:after:w-px [&>li:last-child]:after:bg-border';

export function Timeline({ className, ...props }: ComponentProps<'ol'>): React.JSX.Element {
  return <ol data-slot="timeline" className={cn(timelineClassName, className)} {...props} />;
}
