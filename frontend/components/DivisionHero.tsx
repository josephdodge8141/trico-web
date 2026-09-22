import type { ReactNode } from 'react';
import { ImageIcon } from 'lucide-react';

export interface DivisionHeroBadge {
  readonly label: string;
  readonly icon?: ReactNode;
}

export interface DivisionHeroAction {
  readonly label: string;
  readonly href: string;
  readonly variant: 'primary' | 'secondary';
  readonly icon?: ReactNode;
}

export interface DivisionHeroMedia {
  readonly src?: string;
  readonly alt: string;
  readonly caption?: string;
  readonly state: 'available' | 'unavailable';
}

export interface DivisionHeroProps {
  readonly badges?: readonly DivisionHeroBadge[];
  readonly heading: ReactNode;
  readonly description: string;
  readonly supportingContent?: ReactNode;
  readonly actions?: readonly DivisionHeroAction[];
  readonly stats?: ReactNode;
  readonly media: DivisionHeroMedia;
  readonly labelledBy: string;
}

export function DivisionHero({
  badges = [],
  heading,
  description,
  supportingContent,
  actions = [],
  stats,
  media,
  labelledBy,
}: DivisionHeroProps): React.JSX.Element {
  return (
    <section
      className="ui-division-hero ui-hero ui-split-hero"
      aria-labelledby={labelledBy}
      data-shared-division-hero="true"
    >
      <div className="ui-division-hero-frame">
        <div className="ui-division-hero-copy ui-hero-copy">
          {badges.length === 0 ? null : (
            <div className="ui-division-hero-tags">
              {badges.map((badge) => (
                <span className="ui-division-hero-tag ui-pill ui-pill-blue" key={badge.label}>
                  {badge.icon}
                  {badge.label}
                </span>
              ))}
            </div>
          )}
          <h1 id={labelledBy} className="type-display">
            {heading}
          </h1>
          {supportingContent}
          <p className="ui-division-hero-description">{description}</p>
          {actions.length === 0 ? null : (
            <div className="ui-division-hero-actions ui-actions">
              {actions.map((action) => (
                <a
                  className={`ui-button ui-division-hero-action ui-division-hero-action-${action.variant} ${action.variant === 'primary' ? 'ui-button-gold' : 'ui-button-outline'}`}
                  href={action.href}
                  key={`${action.variant}-${action.href}`}
                >
                  {action.label}
                  {action.icon}
                </a>
              ))}
            </div>
          )}
          {stats === undefined ? null : (
            <div className="ui-division-hero-stats ui-hero-stats">{stats}</div>
          )}
        </div>
        <figure
          className="ui-division-hero-media division-hero-media"
          data-division-hero-media="true"
          data-media-state={media.state}
        >
          {media.src === undefined ? (
            <div className="division-hero-media-placeholder" role="img" aria-label={media.alt}>
              <ImageIcon aria-hidden="true" />
              <span>Photo coming soon</span>
            </div>
          ) : (
            <img src={media.src} alt={media.alt} />
          )}
          {media.caption === undefined ? null : <figcaption>{media.caption}</figcaption>}
        </figure>
      </div>
    </section>
  );
}
