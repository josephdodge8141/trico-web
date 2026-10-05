import type { ComponentProps } from 'react';
import { cn } from 'cn';

type DivProps = ComponentProps<'div'>;

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
