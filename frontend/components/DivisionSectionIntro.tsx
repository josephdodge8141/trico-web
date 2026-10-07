import { Badge } from './ui/badge.js';

export function DivisionSectionIntro({
  eyebrow,
  heading,
  description,
}: {
  readonly eyebrow: string;
  readonly heading: string;
  readonly description: string;
}): React.JSX.Element {
  return (
    <div className="mb-10 max-w-3xl space-y-4">
      <Badge variant="secondary" className="uppercase tracking-widest">
        {eyebrow}
      </Badge>
      <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">{description}</p>
    </div>
  );
}
