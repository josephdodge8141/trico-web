import { ExternalLink, PenLine, Star } from 'lucide-react';

type ReviewPlatform = 'facebook' | 'google' | 'other' | 'yelp';

export interface ReviewPlatformCardProps {
  readonly actionLabel: string;
  readonly description: string;
  readonly externalUrl: string;
  readonly name: string;
  readonly unavailableLabel: string;
}

function platformForName(name: string): ReviewPlatform {
  const normalizedName = name.trim().toLowerCase();
  if (normalizedName === 'google') return 'google';
  if (normalizedName === 'facebook') return 'facebook';
  if (normalizedName === 'yelp') return 'yelp';
  return 'other';
}

function PlatformMark({ platform }: Readonly<{ platform: ReviewPlatform }>) {
  if (platform === 'google') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" data-review-platform-mark="true">
        <path
          fill="currentColor"
          d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"
        />
        <path
          fill="currentColor"
          opacity=".72"
          d="M12 22c2.7 0 4.98-.9 6.63-2.36l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"
        />
        <path
          fill="currentColor"
          opacity=".5"
          d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z"
        />
        <path
          fill="currentColor"
          opacity=".86"
          d="M12 5.94c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"
        />
      </svg>
    );
  }
  if (platform === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" data-review-platform-mark="true">
        <path
          fill="currentColor"
          d="M14 8.4V6.7c0-.82.55-1.01.94-1.01h2.39V2.06L14.04 2C10.4 2 9.57 4.73 9.57 6.48V8.4H7.46v4.08h2.11V22H14v-9.52h2.99l.4-4.08H14Z"
        />
      </svg>
    );
  }
  if (platform === 'yelp') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" data-review-platform-mark="true">
        <path
          fill="currentColor"
          d="m10.22 2.26 2.94-.23.13 7.66-2.05.64-3.9-6.6 2.88-1.47Zm5.26 8.54 6.07 1.12-.67 2.9-5.9-1.94.5-2.08Zm-1.31 4.4 4.14 4.52-2.31 1.9-3.5-5.08 1.67-1.34Zm-4.57-.74.18 6.18-2.98-.17.65-6.14 2.15.13Zm-.82-3.08-1.42 1.59-5.3-3.16 1.64-2.5 5.08 4.07Z"
        />
      </svg>
    );
  }
  return <PenLine aria-hidden="true" data-review-platform-mark="true" />;
}

export function ReviewRating({ value = 5 }: Readonly<{ value?: number }>) {
  return (
    <div
      className="review-rating"
      data-review-rating="true"
      aria-label={`${String(value)} out of 5 stars`}
    >
      {Array.from({ length: value }, (_, index) => (
        <Star key={index} aria-hidden="true" />
      ))}
    </div>
  );
}

export function ReviewPlatformCard({
  actionLabel,
  description,
  externalUrl,
  name,
  unavailableLabel,
}: ReviewPlatformCardProps) {
  const platform = platformForName(name);
  return (
    <article
      className="review-platform-card"
      data-review-platform-card="true"
      data-review-platform={platform}
    >
      <span className="review-platform-mark">
        <PlatformMark platform={platform} />
      </span>
      <h3 className="type-supporting-title">{name}</h3>
      <p>{description}</p>
      {externalUrl === '' ? (
        <span className="review-platform-unavailable">{unavailableLabel}</span>
      ) : (
        <a className="review-platform-action" href={externalUrl} target="_blank" rel="noreferrer">
          {actionLabel} {name} <ExternalLink aria-hidden="true" />
        </a>
      )}
    </article>
  );
}
