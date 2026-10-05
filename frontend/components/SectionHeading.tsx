export interface SectionHeadingProps {
  readonly eyebrow: string;
  readonly heading?: string | undefined;
  readonly description?: string | undefined;
  readonly level?: 'h2' | 'h3';
  readonly className?: string;
  readonly eyebrowClassName?: string;
  readonly titleClassName?: string;
  readonly descriptionClassName?: string;
}

export function SectionHeading({
  eyebrow,
  heading,
  description,
  level: Title = 'h2',
  className,
  eyebrowClassName,
  titleClassName,
  descriptionClassName,
}: SectionHeadingProps): React.JSX.Element {
  return (
    <header className={className} data-slot="section-heading">
      <span className={eyebrowClassName}>{eyebrow}</span>
      {heading === undefined ? null : (
        <Title className={`type-section-title ${titleClassName ?? ''}`}>{heading}</Title>
      )}
      {description === undefined ? null : <p className={descriptionClassName}>{description}</p>}
    </header>
  );
}
