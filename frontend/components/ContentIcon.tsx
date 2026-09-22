import type { LucideIcon } from 'lucide-react';
import { lucideIconNameSchema } from '@app/schemas';

import { contentIconComponents } from './contentIcons.js';

export function ContentIcon({
  name,
  ...props
}: {
  readonly name: string;
} & Omit<React.ComponentProps<LucideIcon>, 'name'>): React.JSX.Element {
  const parsedName = lucideIconNameSchema.parse(name);
  const Icon = contentIconComponents[parsedName];
  if (Icon === undefined)
    throw new Error(`Validated Lucide icon ${parsedName} cannot be rendered.`);
  return <Icon {...props} data-lucide-icon={parsedName} />;
}
