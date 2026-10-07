import { UserRound } from 'lucide-react';

import { Card, CardContent, CardHeader } from './ui/card.js';

export interface ProfileCardProps {
  readonly name: string;
  readonly role: string;
  readonly imageSource?: string | undefined;
  readonly imageAltText: string;
  readonly children?: React.ReactNode;
}

export function ProfileCard({
  name,
  role,
  imageSource,
  imageAltText,
  children,
}: ProfileCardProps): React.JSX.Element {
  return (
    <Card
      className="h-full overflow-hidden border border-border/70 shadow-sm [--card-spacing:0px]"
      data-profile-card="true"
    >
      <div
        className="bg-muted"
        data-profile-media-state={imageSource ? 'available' : 'unavailable'}
      >
        {imageSource ? (
          <img
            className="block aspect-square w-full object-cover object-top"
            src={imageSource}
            alt={imageAltText}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className="grid aspect-square place-items-center text-muted-foreground"
            role="img"
            aria-label={imageAltText}
          >
            <UserRound className="size-12" aria-hidden="true" />
          </div>
        )}
      </div>
      <CardHeader className="justify-items-center gap-1 px-4 py-4 text-center">
        <h3 className="font-heading text-lg font-semibold text-center">{name}</h3>
        <p className="text-center text-sm text-primary" data-profile-role="true">
          {role}
        </p>
      </CardHeader>
      {children === undefined ? null : (
        <CardContent className="space-y-2 px-4 pb-4 text-sm text-muted-foreground">
          {children}
        </CardContent>
      )}
    </Card>
  );
}
